package expo.modules.upiintent

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Bundle
import android.util.Base64
import androidx.core.graphics.drawable.toBitmap
import androidx.core.net.toUri
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

private const val REQUEST_CODE = 4711
private const val PROBE_URI = "upi://pay"
private const val ICON_SIZE_PX = 96

/** An app icon as a small PNG data URI, or null if it can't be drawn. */
private fun iconDataUri(drawable: Drawable): String? =
  try {
    val bitmap = drawable.toBitmap(ICON_SIZE_PX, ICON_SIZE_PX)
    ByteArrayOutputStream().use { out ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
      "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }
  } catch (e: Throwable) {
    null
  }

class UpiAppNotFoundException(packageName: String) :
  CodedException("E_UPI_APP_NOT_FOUND", "No installed app $packageName can handle UPI links", null)

class UpiPaymentInProgressException :
  CodedException("E_UPI_IN_PROGRESS", "A UPI payment is already in progress", null)

/**
 * Launches UPI payment links. Unlike a plain VIEW intent, a chosen app is targeted with
 * Intent.setPackage, so Android opens it directly instead of showing "Open with".
 */
class UpiIntentModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("UpiIntent")

    /** Installed apps that can handle upi://pay links, as { packageName, label, icon }. */
    AsyncFunction("getUpiApps") {
      val packageManager = context.packageManager
      val probe = Intent(Intent.ACTION_VIEW, PROBE_URI.toUri())
      val matches =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          packageManager.queryIntentActivities(
            probe,
            PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY.toLong()),
          )
        } else {
          @Suppress("DEPRECATION")
          packageManager.queryIntentActivities(probe, PackageManager.MATCH_DEFAULT_ONLY)
        }
      matches
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != context.packageName }
        .map {
          mapOf(
            "packageName" to it.activityInfo.packageName,
            "label" to it.loadLabel(packageManager).toString(),
            "icon" to iconDataUri(it.loadIcon(packageManager)),
          )
        }
    }

    /**
     * Opens a UPI link for a result. With a packageName, only that app is used; without
     * one, Android lets the user choose. Resolves with the app's reply when it returns.
     */
    AsyncFunction("startPayment") { uri: String, packageName: String?, promise: Promise ->
      if (pendingPromise != null) {
        throw UpiPaymentInProgressException()
      }
      val intent = Intent(Intent.ACTION_VIEW, uri.toUri())
      if (packageName != null) {
        intent.setPackage(packageName)
        if (intent.resolveActivity(context.packageManager) == null) {
          throw UpiAppNotFoundException(packageName)
        }
      }
      pendingPromise = promise
      try {
        appContext.throwingActivity.startActivityForResult(intent, REQUEST_CODE)
      } catch (e: Throwable) {
        pendingPromise = null
        throw UpiAppNotFoundException(packageName ?: "(any)")
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) {
        return@OnActivityResult
      }
      val data = payload.data
      val result = Bundle().apply {
        putInt("resultCode", payload.resultCode)
        // UPI apps reply with "txnId=…&Status=…" in `response`; some send `Status` alone.
        data?.getStringExtra("response")?.let { putString("response", it) }
        data?.getStringExtra("Status")?.let { putString("status", it) }
      }
      pendingPromise?.resolve(result)
      pendingPromise = null
    }
  }
}
