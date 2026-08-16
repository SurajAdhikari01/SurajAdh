const fallbackUrl = "https://surajadh.pages.dev";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(
  /\/$/,
  "",
);

export const siteName = "Suraj Adhikari";
export const siteTitle =
  "Suraj Adhikari — Software, AI & C++ Engineer in Nepal";
export const siteDescription =
  "Nepal-based software and AI engineer specializing in C++, machine learning, and modern web systems. Available for remote engineering work worldwide.";
