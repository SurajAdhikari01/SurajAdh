import "server-only";

export type GitHubRepository = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  fork: boolean;
};

export type GitHubProfile = {
  login: string;
  html_url: string;
  public_repos: number;
  followers: number;
};

export type GitHubShowcase = {
  profile: GitHubProfile;
  repositories: GitHubRepository[];
  totalStars: number;
  fetchedAt: string;
};

const FALLBACK: GitHubShowcase = {
  profile: {
    login: "SurajAdhikari01",
    html_url: "https://github.com/SurajAdhikari01",
    public_repos: 0,
    followers: 0,
  },
  repositories: [],
  totalStars: 0,
  fetchedAt: new Date(0).toISOString(),
};

export async function getGitHubShowcase(): Promise<GitHubShowcase> {
  const username = process.env.GITHUB_USERNAME || "SurajAdhikari01";
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers,
      }),
      fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
        { headers },
      ),
    ]);

    if (!profileResponse.ok || !reposResponse.ok) {
      throw new Error(`GitHub API returned ${profileResponse.status}/${reposResponse.status}`);
    }

    const profile = (await profileResponse.json()) as GitHubProfile;
    const allRepositories = (await reposResponse.json()) as GitHubRepository[];
    const repositories = allRepositories
      .filter((repo) => !repo.fork && repo.name.toLowerCase() !== "surajadh")
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      .slice(0, 6);

    return {
      profile,
      repositories,
      totalStars: allRepositories.reduce(
        (total, repo) => total + repo.stargazers_count,
        0,
      ),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("GitHub showcase refresh failed:", error);
    return {
      ...FALLBACK,
      profile: { ...FALLBACK.profile, login: username, html_url: `https://github.com/${username}` },
    };
  }
}
