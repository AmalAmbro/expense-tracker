import { TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** A TextInput whose text and placeholder colors follow the light/dark theme. */
export function ThemedTextInput({ style, placeholderTextColor, ...rest }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? theme.textSecondary}
      style={[{ color: theme.text }, style]}
      {...rest}
    />
  );
}
