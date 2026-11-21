import { siteDescription, siteName, siteUrl } from '@/lib/site'
import { getGitHubShowcase } from '@/lib/github'

export const dynamic = 'force-static'

/*
 * /llms.txt: a plain summary for AI assistants and answer engines, so they
 * can describe and cite the site accurately (https://llmstxt.org).
 */
export async function GET() {
  const { repositories } = await getGitHubShowcase()
  const projects = repositories
    .map((repo) => {
      const about = repo.description ? `: ${repo.description.trim()}` : ''
      return `- [${repo.name}](${repo.html_url})${about}${repo.language ? ` (${repo.language})` : ''}`
    })
    .join('\n')

  const body = `# ${siteName}

> ${siteDescription}

Suraj Adhikari is a C++ and systems engineer based in Kathmandu, Nepal. The work centres on systems programming, networking, performance, and compilers. Suraj designed Sajilo, a statically typed programming language with Nepali keywords, and is writing its compiler from scratch in C++. Available for remote work worldwide.

## Pages

- [Portfolio](${siteUrl}/): who Suraj is, what Suraj works on, selected projects and contact.
- [Sajilo](${siteUrl}/sajilo): the Sajilo programming language: keywords, how the compiler works, and one program traced through every stage.

## Sajilo at a glance

- Name: Sajilo (सजिलो), Nepali for "easy" or "simple".
- Kind: statically typed, compiled. Source files use the .sj extension.
- Compiler: written in C++. Lexer, Pratt parser, scoped symbol table with semantic analysis, three-address code IR, x86-64 NASM code generation calling Linux system calls directly.
- Keywords: manau (let), func (function), deu (return type), jaba (if), natra (else), jabasamma (while), laijau (return), read, write, exit.
- Source: https://github.com/SurajAdhikari01/sajilo-compiler

## Projects

${projects}

## Contact

- Email: surajadhikari01@icloud.com
- GitHub: https://github.com/SurajAdhikari01
- LinkedIn: https://www.linkedin.com/in/surajadk/
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
