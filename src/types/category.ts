export type Category = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  isEssentialDefault: boolean;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};
