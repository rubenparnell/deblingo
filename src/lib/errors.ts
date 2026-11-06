export function getReadableError(message: string) {
  if (
    message.includes("profiles_username_lower_idx") ||
    message.toLowerCase().includes("duplicate key value")
  ) {
    return "That username is already taken. Please choose another.";
  }
  return message;
}
