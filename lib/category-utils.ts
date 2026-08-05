export const CATEGORY_LABELS: Record<string, string> = {
  add_record: "Add Record",
  edit_record: "Edit Record",
  delete_record: "Delete Record",
  user_created: "User Created",
  permission_change: "Permission Change",
  member_activity: "Member Activity",
  profile_update: "Profile Update",
};

export const CATEGORY_STYLES: Record<string, string> = {
  add_record: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  edit_record: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete_record: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  user_created: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  permission_change: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  member_activity: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  profile_update: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] || key;
}
