# Storybook Gen Illustration

[Deploy this project to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpacepocohontas%2Fstorybook-gen-illustration-&project-name=storybook-gen-illustration)

Standalone project for turning uploaded manuscripts into illustrated novels.

## Core product direction
- Upload PDF, DOCX, TXT, EPUB, RTF and preserve source text.
- Extract chapters/scenes and build a story bible.
- Maintain up to 10 primary character reference profiles.
- Lock physical traits and carry a character consistency seed into every image request.
- Visual presets: Manga, 90s Manga, 90s Anime, hand-drawn storybook, concept art, comic book, graphic novel, watercolor, dark gothic, cinematic realism and custom.
- Generate scene illustrations, chapter covers, comic/manga pages and full novel layouts.
- Review/regenerate pages without silently changing canon.
- Export PDF, EPUB, CBZ, PNG bundles and project JSON/ZIP.

## Current milestone
The initial Next.js App Router foundation is intentionally separate from all other projects. The UI is functional for navigation, manuscript selection, character slot management, trait locks and style selection. The next implementation layer is real parsing, persistence, provider APIs, generation queue, consistency validation and export.

## Deployment

The repository is configured for Vercel and the GitHub build check is passing. Vercel can auto-detect Next.js from this repository.
Designed for Vercel. Keep image/provider API keys server-side. Do not put provider secrets in client code.