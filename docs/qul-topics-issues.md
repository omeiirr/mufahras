## Data issues in "Topics and concepts" (topics.db)

Resource: **Topics and concepts**, `topics.db`, downloaded from https://qul.tarteel.ai/resources on 2026-10-23 (2,512 rows).

I use this data in an open-source Quran and hadith search app ([Mufahras](https://github.com/omeiirr/mufahras)) and found the issues below while building a topic tree from it. IDs are `topic_id`. Thanks for publishing this data.

### 1. "Prophets (25 mentioned by name)" (2284) has rows shifted between prophets

Topic 2284 has 22 children, not 25. Several rows near the end look shifted by one, so entries end up under the wrong prophet:

| topic_id | Name | Parent | What's wrong |
|---|---|---|---|
| 2313 | tested then rewarded | 36 Jesus | Its only ayah is 21:83, about Job (Ayyub). Job has no entry under 2284. |
| 2314 | `Job\tthe Baptist (ﷺ)` | 2284 | Looks like "Job" and "John the Baptist" merged into one name. Its only child, 2308 "birth and prophethood" (2:136, 3:38–41), is about John (Yahya). |
| 2315 | John | 2284 | Its only child, 2316 "swallowed by whale then saved" (10:98), is about Jonah (Yunus). |
| 2307 | Issac | 2284 | Misspelt (Isaac). No ayahs and no children. |
| 2350 | Muhammd | 2284 | Misspelt (Muhammad). No ayahs and no children. |
| 2352 | Shuaib | 2284 | No ayahs of its own; see item 2 for its only child. |

Job (819) and Jonah (821) do exist as topics, under 2068, but not under 2284. After moving 2313 under Job, renaming 2314 to John the Baptist, and listing Job and Jonah under 2284, the list has the full 25.

### 2. "with his people" (2305, under Shuaib) holds five prophets' passages

Topic 2305 "with his people" has parent 2352 Shuaib. Its ayahs cover the stories of five prophets with their people:

- 37:123–130 (Elias)
- 7:65–72 (Hud)
- 7:73–79 (Salih)
- 7:80–84 (Lot)
- 7:85–93 (Shuaib)

Only 7:85–93 belongs to Shuaib. It looks like the "with his people" entries of several prophets were merged into one row.

### 3. Muhammad (97) has "Interpertations of dreams" as its thematic parent

Topic 97 Muhammad has `thematic_parent_id` 2263 "Interpertations of dreams" (whose own parent is "Political"). The other children of 2263 are "of Abraham" and "Joseph", so this may be meant as "dreams of Muhammad". Filing the prophet himself under dreams looks unintended. Please check.

### 4. Tabs, line breaks and missing spaces in names

- **68 names contain tabs and line breaks**, apparently from the index they were copied from. For example:
  - 399 `argue in a kindly manner with those given earlier \n\t\t\t\trevelation`
  - 458 `correctness \n\t\t\t\t\tof`
- **2 names have leading or trailing whitespace.**
- **5 names are missing a space before "("**:
  - 2157 `see Prophets(under Stories)`
  - 2284 `Prophets(25 mentioned by name)`
  - 2304 `Enoch(mentioned passingly)`
  - 2306 `Elisha(mentioned passingly)`
  - 2360 `Zul-kifl(mentioned passingly)`

### 5. Spelling

| topic_id | Name | Probably |
|---|---|---|
| 1882 | Doctraine | Doctrine |
| 2380 | Parabels | Parables |
| 364 | Apostacy | Apostasy |
| 2263 | Interpertations of dreams | Interpretations of dreams |
| 977, 1093 | Muhammed | Muhammad (spelt "Muhammad" in 97) |
| 628, 884, 1064 | aquire | acquire |
| 2322 | Chief Minster’s wife tries to seduce him | Minister’s |
| 2307 | Issac | Isaac |
| 2350 | Muhammd | Muhammad |

### 6. The same topic under two names that differ only in case

These pairs look like duplicates. In each pair one is placed in the hierarchy and the other has no parent:

| topic_id | Name | Parent |
|---|---|---|
| 4 / 1564 | Last Day / Last day | Afterlife Event / none |
| 21 / 1483 | Golden Calf / Golden calf | Idol / none |
| 205 / 901 | Lote Tree / Lote tree | Afterlife Location / none |
| 244 / 1249 | Abu Lahab / Abu lahab | Quraysh / none |
| 1016 / 1637 | Old Testament / Old testament | none / none |
| 1111 / 1691 | Red Sea / Red sea | none / none (1111 has no ayahs; 1691 has 2:50, 20:77–78, 26:63–66) |
| 1192 / 1798 | Ten Commandments / Ten commandments | none / none |

(826 / 2264 "Joseph" also appears twice: under the prophets and under "Interpertations of dreams". That may be intended.)

### 7. Cross-reference stubs stored as empty topics

48 topics have no ayahs and no children. Most are "see …" cross-references kept as topics, for example:

- 300 `Adultery (see Marriage)`
- 308 `Alcohol (see Intoxicants)`
- 375 `Ark (see Noah)`
- 765 `Interest on loans (see Usury)`
- 2157 `see Prophets(under Stories)`

These might work better as `related_topics` links on the target topic, or be dropped.

### 8. Note: two parallel prophet lists with different spellings

The ontology tree (Living Creation › Sentient Creation › Human › **Prophet** 272 and **Messenger** 271) and the thematic tree (Stories › **Prophets (25 mentioned by name)** 2284) both list the prophets, under different names. For example:

- Ibrahim (44) and Abraham (289)
- Nuh (86) and Noah (1007)
- Musa (20, under Messenger) and Moses (967)
- Yahya (89) and John (2314)

That's probably by design, since the two trees come from different sources. Linking each pair through `related_topics` would help apps that show both.

---

How I found these: I loaded `topics.db` as is, built the parent/child tree from `parent_id`, `thematic_parent_id` and `ontology_parent_id`, and compared names and ayah lists. There are no dangling parent IDs, self-parents or cycles. If useful, the workaround I apply in my build for item 1 is in [`scripts/build-data.ts`](https://github.com/omeiirr/mufahras/blob/main/scripts/build-data.ts) (`fixProphets`).
