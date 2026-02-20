let memCredits = Number(process.env.STARTER_CREDITS || 25);

export function isTestMode() {
  return String(process.env.TEST_MODE || "").toLowerCase() === "true";
}

export function getTestCredits() {
  return memCredits;
}

export function setTestCredits(v) {
  memCredits = Math.max(0, Number(v || 0));
  return memCredits;
}
