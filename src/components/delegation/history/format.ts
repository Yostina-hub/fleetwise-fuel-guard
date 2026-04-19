import { formatDistanceToNowStrict } from "date-fns";

export const formatHistoryRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes === 1 ? "" : "s"} ago`;
  }

  if (totalMinutes < 24 * 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0
      ? `${hours} hr${hours === 1 ? "" : "s"} ago`
      : `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min ago`;
  }

  return formatDistanceToNowStrict(date, { addSuffix: true, roundingMethod: "floor" });
};
