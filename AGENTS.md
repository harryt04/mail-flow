<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read the docs before exploring

Before searching the codebase, read [docs/README.md](docs/README.md) — it indexes a `docs/`
tree that mirrors `src/` and answers "where does X live" / "where should new code for X go"
for most tasks. Check [docs/DECISION-TREE.md](docs/DECISION-TREE.md) if you're not sure which
doc applies. If the docs don't answer your question, explore as normal, then update the
relevant `docs/*.md` file with what you learned in the same change — these docs are a map
(purpose, key files, dependencies, where to add code), not an API reference, so keep additions
at that level rather than documenting internal logic line-by-line.


# Important
Before considering your work done, please format/validate by running `npm run prettify; npm run ci`