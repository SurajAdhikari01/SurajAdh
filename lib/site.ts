const fallbackUrl = "https://surajadh.pages.dev";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(
  /\/$/,
  "",
);

export const siteName = "Suraj Adhikari";
export const siteTitle =
  "Suraj Adhikari — C++ & Software Engineer in Nepal";
export const siteDescription =
  "Nepal-based C++ and software engineer focused on systems programming, networking, performance, and dependable products. Available for remote engineering work worldwide.";
