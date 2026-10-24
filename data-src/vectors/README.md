# Search-by-meaning vectors

One vector per verse and per English hadith, for "Search by meaning" (see PLAN.md).

- `arctic-s.q8.i8`: 40,393 × 384 signed bytes, row-major, in the order of `index.json` → `refs`.
  A value divided by `scale.q8` gives the float component (vectors are unit length before rounding).
- `index.json`: model and pinned revision, query prefix, pooling, token limit, the text recipe, and for each
  row its reference and a 12-character SHA-1 of the embedded text.

**Made with** `eval/meaning-vectors.ipynb`: [snowflake-arctic-embed-s](https://huggingface.co/Snowflake/snowflake-arctic-embed-s)
(Apache 2.0) at the pinned revision, its 8-bit ONNX file (`onnx/model_quantized.onnx`, the one the app runs),
one text at a time, CLS pooling, 256 tokens.

**Texts (recipe 1):** a verse is its Saheeh International translation, a space, and its Al-Mukhtasar
explanation; a hadith is its English text. Footnote markers removed, whitespace collapsed.

**When the data changes**, the build compares each text's hash with `hashes` and re-embeds only the texts that
changed. Regenerate this file with the notebook when the model or the recipe changes.

The 8-bit model's arithmetic differs slightly between processors (cosine ~0.998 between machines), which
doesn't affect ranking; see PLAN.md.
