# Using and publishing the Mthandizi skill

This skill follows the `SKILL.md` convention used by the skills ecosystem.

## Local project use

From the Mthandizi project root:

```bash
npx skills add ./skills/mthandizi-malawi-expert
```

Choose your coding agent when prompted. The CLI installs skills into the supported agent's project skill directory. The CLI and skills.sh install are intended for development agents; they do not automatically inject the skill into Mthandizi's live Groq requests.

## Mthandizi runtime use

The Mthandizi server also loads this `SKILL.md` and adds its instructions to the Groq system message. Keep the skill file in the deployed project at:

`skills/mthandizi-malawi-expert/SKILL.md`

Do not rely on the developer-agent installation as the production runtime loader.

## Publish to skills.sh

1. Create a public GitHub repository, for example `mthandizi-malawi-expert`.
2. Put this skill folder at the repository root, or in a discoverable skills directory.
3. Commit and push `SKILL.md` and its references.
4. Install it from the GitHub repository:

```bash
npx skills add YOUR_GITHUB_USERNAME/mthandizi-malawi-expert
```

5. The skills.sh listing/install page is discoverable from the repository after it is publicly available and indexed. Publishing is not completed just by creating a local ZIP.

## Safety and maintenance

- Do not put API keys, passwords, personal records or private user conversations in a skill.
- Keep reusable instructions in `SKILL.md`; put larger factual references in `references/`.
- Date and cite maintained factual reference files.
- Review skill changes before installing or publishing them.
