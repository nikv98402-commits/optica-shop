# Knowledge source review

## Repository workflow

1. Add independently reviewed Markdown under
   `content/knowledge-assistant/documents/`.
2. Add metadata to `content/knowledge-assistant/sources.json`.
3. Record the exact article-level license, commercial-use and adaptation
   permissions, reviewer role, review timestamp, and SHA-256 of the file.
4. Run `npm run knowledge:index:dry` and review source/chunk counts, license
   totals, and hashes.
5. After editorial and safety approval, run the real indexer with server-only
   credentials in a controlled environment.

The registry fails closed for missing metadata, unapproved sources, changed
hashes without a new review, and translations when adaptation is forbidden.

## License policy

- `vilu-owned`: may be indexed, adapted, and translated after editorial review.
- `cc-by`: review the individual article and attribution before adaptation.
- No-derivatives licenses: do not store or translate article text. Only a
  separately authored ViLu summary may be reviewed and indexed.
- `link-only`, unclear license, and free-to-read without reuse permission: no
  body, figure, screenshot, or translation is stored.

OcuLearning is currently an approved outbound directory entry with
`index:false`; no OcuLearning text is copied or translated. Nature, Eye Open,
Science, and partner-journal items must be approved article by article and are
not licensed journal-wide.

## Hash update

When reviewed text changes, calculate a new SHA-256, update `contentSha256`,
and set a new `reviewedAt` only after an editor has reviewed the complete new
text. Never update the hash merely to make the gate pass.
