# Meaning-search evaluation queries 

Each query is something a person might type, with the verses and hadith that should come up in the top 10.
Every expected text was checked against the app's data (Saheeh International; hadith-api's English and numbering).

Answers marked *(also)* were added after the first model comparison: correct texts the models found that
the first draft didn't list, often the same hadith in another book. They count for "found in the top 10"
but not for recall, which measures only the original answers.

**To review:** correct anything wrong, add expected answers that are missing, and add searches real users would type
(under any heading). Edit `eval/meaning-queries.json`, or note changes here and I'll apply them.

60 queries.

## Feelings (2)

| Query | Expected | Text |
|---|---|---|
| dealing with anxiety and worry | 13:28 | Those who have believed and whose hearts are assured by the remembrance of Allāh. Unquestionably, by the remembrance of Allāh hearts are assured." |
|  | 94:6 | Indeed, with hardship [will be] ease. |
|  | 65:3 | And will provide for him from where he does not expect. And whoever relies upon Allāh - then He is sufficient for him. Indeed, Allāh will… |
|  | Bukhari 6369 *(also)* | The Prophet (ﷺ) used to say, "O Allah! I seek refuge with You from worry and grief, from incapacity and laziness, from cowardice and miserliness,… |
|  | Bukhari 6363 *(also)* | The Prophet (ﷺ) said to Abu Talha, "Choose one of your boys to serve me." So Abu Talha took me (to serve the Prophet (ﷺ) ) by giving me a ride… |
|  | Abu Dawud 1541 *(also)* | Anas b. Malik said:I used to serve the Prophet (ﷺ) and often hear him say: "O Allah, I seek refuge in You from grief and anxiety, from the… |
| feeling hopeless after sinning | 39:53 | Say, "O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allāh. Indeed, Allāh forgives all sins.… |
|  | 15:56 *(also)* | He said, "And who despairs of the mercy of his Lord except for those astray?" |
|  | Bukhari 4810 *(also)* | Some pagans who committed murders in great number and committed illegal sexual intercourse excessively, came to Muhammad and said, "O Muhammad!… |
|  | Muslim 322 *(also)* | It is narrated on the authority of Ibn 'Abbas that some persons amongst the polytheist had committed a large number of murders and had… |
|  | Tirmidhi 3237 *(also)* | "I heard the Messenger of Allah (ﷺ) reciting: 'Say: "O My slaves who have transgressed against themselves! Despair not of the mercy of Allah,… |

## Concepts (18)

| Query | Expected | Text |
|---|---|---|
| Allah is near and answers when I call | 2:186 | And when My servants ask you, [O Muḥammad], concerning Me - indeed I am near. I respond to the invocation of the supplicant when he calls upon… |
|  | 40:60 | And your Lord says, "Call upon Me; I will respond to you." Indeed, those who disdain My worship will enter Hell [rendered] contemptible. |
| kindness to parents | 17:23 | And your Lord has decreed that you worship not except Him, and to parents, good treatment. Whether one or both of them reach old age [while] with… |
|  | 31:14 | And We have enjoined upon man [care] for his parents. His mother carried him, [increasing her] in weakness upon weakness, and his weaning is in… |
|  | 46:15 | And We have enjoined upon man, to his parents, good treatment. His mother carried him with hardship and gave birth to him with hardship, and his… |
| eating up the wealth of orphans | 4:10 | Indeed, those who devour the property of orphans unjustly are only consuming into their bellies fire. And they will be burned in a Blaze [i.e.,… |
|  | 4:2 | And give to the orphans their properties and do not substitute the defective [of your own] for the good [of theirs]. And do not consume their… |
| do not spy on each other or backbite | 49:12 | O you who have believed, avoid much [negative] assumption. Indeed, some assumption is sin. And do not spy or backbite each other. Would one of… |
| patience when tested with loss | 2:155 | And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient, |
|  | 2:156 | Who, when disaster strikes them, say, "Indeed we belong to Allāh, and indeed to Him we will return." |
| men and women get equal reward for good deeds | 33:35 | Indeed, the Muslim men and Muslim women, the believing men and believing women, the obedient men and obedient women, the truthful men and… |
|  | 16:97 | Whoever does righteousness, whether male or female, while he is a believer - We will surely cause him to live a good life, and We will surely… |
|  | 3:195 | And their Lord responded to them, "Never will I allow to be lost the work of [any] worker among you, whether male or female; you are of one… |
| giving charity in secret | 2:271 | If you disclose your charitable expenditures, they are good; but if you conceal them and give them to the poor, it is better for you, and He will… |
| interest and usury are forbidden | 2:275 | Those who consume interest cannot stand [on the Day of Resurrection] except as one stands who is being beaten by Satan into insanity. That is… |
|  | 2:278 | O you who have believed, fear Allāh and give up what remains [due to you] of interest, if you should be believers. |
| forgive others so Allah forgives you | 24:22 | And let not those of virtue among you and wealth swear not to give [aid] to their relatives and the needy and the emigrants for the cause of… |
| cheating in weights and measures | 83:1 | Woe to those who give less [than due], |
|  | 17:35 | And give full measure when you measure, and weigh with an even [i.e., honest] balance. That is the best [way] and best in result. |
| signs in the creation of the heavens and earth | 3:190 | Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding - |
|  | 2:164 | Indeed, in the creation of the heavens and the earth, and the alternation of the night and the day, and the [great] ships which sail through the… |
| speak to people in a good way | 2:83 | And [recall] when We took the covenant from the Children of Israel, [enjoining upon them], "Do not worship except Allāh; and to parents do good… |
|  | 17:53 | And tell My servants to say that which is best. Indeed, Satan induces [dissension] among them. Indeed Satan is ever, to mankind, a clear enemy. |
|  | 17:28 *(also)* | And if you [must] turn away from them [i.e., the needy] awaiting mercy from your Lord which you expect, then speak to them a gentle word. |
|  | 20:44 *(also)* | And speak to him with gentle speech that perhaps he may be reminded or fear [Allāh]." |
|  | Bukhari 2989 *(also)* | Allah's Messenger (ﷺ) said, "There is a (compulsory) Sadaqa (charity) to be given for every joint of the human body (as a sign of gratitude to… |
| Jesus was not killed or crucified | 4:157 | And [for] their saying, "Indeed, we have killed the Messiah, Jesus the son of Mary, the messenger of Allāh." And they did not kill him, nor did… |
| do not walk proudly on the earth | 17:37 | And do not walk upon the earth exultantly. Indeed, you will never tear the earth [apart], and you will never reach the mountains in height. |
|  | 31:18 | And do not turn your cheek [in contempt] toward people and do not walk through the earth exultantly. Indeed, Allāh does not like everyone… |
| rights of neighbours | Bukhari 6014 | The Prophet (ﷺ) said "Gabriel continued to recommend me about treating the neighbors Kindly and politely so much so that I thought he would order… |
|  | 4:36 | Worship Allāh and associate nothing with Him, and to parents do good, and to relatives, orphans, the needy, the near neighbor, the neighbor… |
|  | Bukhari 6015 *(also)* | Narrates Ibn `Umar:Allah's Apostle said, Gabriel kept on recommending me about treating the neighbors in a kind and polite manner, so much so… |
|  | Abu Dawud 5151 *(also)* | ‘A’ishah reported the Messenger of Allah (May peace be upon him) as saying:Gabriel kept on commending the neighbor to me so that I thought he… |
|  | Bukhari 5185 *(also)* | The Prophet (ﷺ) said, "Whoever believes in Allah and the Last Day should not hurt (trouble) his neighbor. And I advise you to take care of the… |
|  | Muslim 174 *(also)* | It is reported on the authority of Abu Huraira that the Messenger of Allah (may peace and blessings be upon him) observed:He who believes in… |
| visiting the sick | Bukhari 5649 | The Prophet (ﷺ) said, "Feed the hungry, visit the sick, and set free the captives |
|  | Muslim 6551 *(also)* | Abu Rabi' reported directly from Allah's Apostle (may peace upon him) as saying:The one who visits the sick is in fact like one who is in the… |
|  | Muslim 6552 *(also)* | Thauban, the freed slave of Allah's Messenger (ﷺ), reported that Allah's Messenger (ﷺ) said:He who visits the sick continues to remain in the… |
|  | Muslim 6554 *(also)* | Thauban, the freed slave of Allah's Messenger (ﷺ), reported Allah's Messenger (ﷺ) as saying:He who visits the sick is supposed to remain in the… |
|  | Ibn Majah 1443 *(also)* | It was narrated from Abu Hurairah that the Messenger of Allah (ﷺ) said:‘Whoever visits a sick person, a caller calls from heaven: ‘May you be… |
|  | Abu Dawud 3105 *(also)* | The Messenger of Allah (ﷺ) as saying: Feed the hungry, visit the sick and free the captive. Sufyan said: al-'ani means captive |
|  | Bukhari 1240 *(also)* | I heard Allah's Messenger (ﷺ) saying, "The rights of a Muslim on the Muslims are five: to respond to the salaam, visiting the sick, to follow the… |
| the reward of a martyr | 3:169 | And never think of those who have been killed in the cause of Allāh as dead. Rather, they are alive with their Lord, receiving provision, |
|  | 2:154 *(also)* | And do not say about those who are killed in the way of Allāh, "They are dead." Rather, they are alive, but you perceive [it] not. |
|  | Muslim 4885 *(also)* | It has been narrated on the authority of Masruq Who said:We asked 'Abdullah about the Qur'anic verse:" Think not of those who are slain in… |
|  | Bukhari 2817 *(also)* | The Prophet (ﷺ) said, "Nobody who enters Paradise likes to go back to the world even if he got everything on the earth, except a Mujahid who… |
| punishment for those who hoard gold and silver | 9:34 | O you who have believed, indeed many of the scholars and the monks devour the wealth of people unjustly and avert [them] from the way of Allāh.… |

## Questions (4)

| Query | Expected | Text |
|---|---|---|
| what to say when you are afraid of enemies | 3:173 | Those to whom people [i.e., hypocrites] said, "Indeed, the people have gathered against you, so fear them." But it [merely] increased them in… |
|  | 3:175 *(also)* | That is only Satan who frightens [you] of his supporters. So fear them not, but fear Me, if you are [indeed] believers. |
| what is backbiting | Muslim 6593 | Abu Huraira reported Allah's Messenger (ﷺ) as saying:Do you know what is backbiting? They (the Companions) said: Allah and His Messenger know… |
|  | Tirmidhi 1934 *(also)* | Abu Hurairah narrated that it was said:" O Messenger of Allah! What is backbiting?" He said : " Mentioning your brother with that which he does… |
|  | Abu Dawud 4874 *(also)* | Abu Hurairah said:The Messenger of Allah (ﷺ) was asked: Messenger of Allah! What is back-biting? He replied: It is saying something about your… |
| which deed is best: prayer at its time | Bukhari 527 | I asked the Prophet (ﷺ) "Which deed is the dearest to Allah?" He replied, "To offer the prayers at their early stated fixed times." I asked,… |
| is lying ever allowed | Bukhari 2692 | That she heard Allah's Messenger (ﷺ) saying, "He who makes peace between the people by inventing good information or saying good things, is not a liar |
|  | Tirmidhi 1939 *(also)* | Asma bint Yazid narrated that the Messenger of Allah said:"it is not lawful to lie except in three cases: Something the man tells his wife to… |
|  | Muslim 6633 *(also)* | Humaid b. 'Abd al-Rahman b. 'Auf reported that his mother Umm Kulthum daughter of 'Uqba b. Abu Mu'ait, and she was one amongst the first… |
|  | Abu Dawud 4920 *(also)* | Humaid b. 'Abd al-Rahman quoted his mother as saying:The Prophet (ﷺ) said: He who forged in order to put things right between two persons did not… |
|  | Abu Dawud 4921 *(also)* | Umm Kulthum, daughter of ‘Uqbah, said:I did not hear the Messenger of Allah (ﷺ) making a concession for anything people say falsely except in… |

## Verses, in other words (12)

| Query | Expected | Text |
|---|---|---|
| there is no compulsion in religion | 2:256 | There shall be no compulsion in [acceptance of] the religion. The right course has become distinct from the wrong. So whoever disbelieves in… |
| killing one person is like killing all of humanity | 5:32 | Because of that, We decreed upon the Children of Israel that whoever kills a soul unless for a soul or for corruption [done] in the land - it is… |
| wine and gambling are from Satan | 5:90 | O you who have believed, indeed, intoxicants, gambling, [sacrificing on] stone alters [to other than Allāh], and divining arrows are but… |
| everyone will die | 3:185 | Every soul will taste death, and you will only be given your [full] compensation on the Day of Resurrection. So he who is drawn away from the… |
|  | 21:35 | Every soul will taste death. And We test you with evil and with good as trial; and to Us you will be returned. |
| God does not change a people until they change themselves | 13:11 | For him [i.e., each one] are successive [angels] before and behind him who protect him by the decree of Allāh. Indeed, Allāh will not change the… |
| we made you nations and tribes to know one another | 49:13 | O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another. Indeed, the most noble… |
| the night better than a thousand months | 97:3 | The Night of Decree is better than a thousand months. |
| fasting was prescribed for you as for those before you | 2:183 | O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous - |
| if you are grateful I will give you more | 14:7 | And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is… |
| a good word is like a good tree | 14:24 | Have you not considered how Allāh presents an example, [making] a good word like a good tree, whose root is firmly fixed and its branches [high]… |
| believers are brothers so make peace between them | 49:10 | The believers are but brothers, so make settlement between your brothers. And fear Allāh that you may receive mercy. |
| spending in Allah's way grows like a seed with seven ears | 2:261 | The example of those who spend their wealth in the way of Allāh is like a seed [of grain] which grows seven spikes; in each spike is a hundred… |

## Stories (2)

| Query | Expected | Text |
|---|---|---|
| young men who slept in a cave | 18:10 | [Mention] when the youths retreated to the cave and said, "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance." |
| Mary in labour under the palm tree | 19:23 | And the pains of childbirth drove her to the trunk of a palm tree. She said, "Oh, I wish I had died before this and was in oblivion, forgotten." |

## Hadith, in other words (22)

| Query | Expected | Text |
|---|---|---|
| none of you truly believes until he loves for his brother what he loves for himself | Bukhari 13 | The Prophet (ﷺ) said, "None of you will have faith till he wishes for his (Muslim) brother what he likes for himself |
| actions are judged by their intentions | Bukhari 1 | I heard Allah's Messenger (ﷺ) saying, "The reward of deeds depends upon the intentions and every person will get the reward according to what he… |
|  | Bukhari 54 *(also)* | Allah's Messenger (ﷺ) said, "The reward of deeds depends upon the intention and every person will get the reward according to what he has… |
|  | Bukhari 2529 *(also)* | The Prophet (ﷺ) said, "The (reward of) deeds depend on intentions, and every person will get the reward according to what he intends. So, whoever… |
|  | Bukhari 3898 *(also)* | I heard the Prophet (ﷺ) saying, "The reward of deeds depends on the intentions, so whoever emigrated for the worldly benefits or to marry a… |
|  | Bukhari 5070 *(also)* | The Prophet (ﷺ) said, "The rewards (of deeds) are according to the intention, and everybody will get the reward for what he has intended. So… |
|  | Muslim 4927 *(also)* | It has been narrated on the authority of Umar b. al-Khattab that the Messenger of Allah (ﷺ) said:(The value of) an action depends on the… |
|  | Abu Dawud 2201 *(also)* | ‘Umar bin Al Khattab reported the Apostle of Allaah(ﷺ) as saying “Actions are to be judged only by intentions and a man will have only what he… |
|  | Tirmidhi 1647 *(also)* | That the Messenger of Allah (ﷺ) said: "Deeds are but with intentions, and for the man is only what he intended. So one whose emigration was to… |
|  | Nasa'i 75 *(also)* | It was narrated that 'Umar bin Al-Khattab (may Allah be pleased with him) said:"The Messenger of Allah said: 'Actions are only done with… |
|  | Nasa'i 3437 *(also)* | It was narrated that 'Umar bin Al-Khattab, may Allah be pleased with him, said that the Messenger of Allah said:"Actions are but by intentions,… |
|  | Nasa'i 3794 *(also)* | It was narrated from 'Umar bin Al-Khattab that the Prophet said:"Actions are but by intentions, and each person will have but that which he… |
| the strong man is the one who controls his anger | Bukhari 6114 | Allah's Messenger (ﷺ) said, "The strong is not the one who overcomes the people by his strength, but the strong is the one who controls himself… |
|  | Muslim 6644 *(also)* | Abu Huraira reported:I heard Allah's Messenger (ﷺ) as saying: One is not strong because of one's wrestling skillfully. They said: Allah's… |
| say something good or stay quiet | Bukhari 6018 | Allah's Messenger (ﷺ) said, "Anybody who believes in Allah and the Last Day should not harm his neighbor, and anybody who believes in Allah and… |
|  | Bukhari 6475 *(also)* | Allah's Messenger (ﷺ) said, "Whoever believes in Allah and the Last Day should talk what is good or keep quiet, and whoever believes in Allah and… |
|  | Muslim 173 *(also)* | It is reported on the authority of Abu Huraira that the Messenger of Allah (ﷺ) observed:He who believes in Allah and the Last Day should either… |
| smiling at your brother is charity | Tirmidhi 1956 | Abu Dharr narrated that the Messenger of Allah said :"Your smiling in the face of your brother is charity, commanding good and forbidding evil is… |
| a man was forgiven for giving water to a thirsty dog | Bukhari 2363 | Allah's Messenger (ﷺ) said, "While a man was walking he felt thirsty and went down a well and drank water from it. On coming out of it, he saw a… |
|  | Bukhari 173 *(also)* | The Prophet (ﷺ) said, "A man saw a dog eating mud from (the severity of) thirst. So, that man took a shoe (and filled it) with water and kept on… |
|  | Bukhari 3467 *(also)* | The Prophet (ﷺ) said, "While a dog was going round a well and was about to die of thirst, an Israeli prostitute saw it and took off her shoe and… |
|  | Bukhari 6009 *(also)* | Allah's Messenger (ﷺ) said, "While a man was walking on a road. he became very thirsty. Then he came across a well, got down into it, drank (of… |
|  | Muslim 5859 *(also)* | Abu Huraira reported Allah's Messenger (ﷺ) as sayings:A person suffered from intense thirst while on a journey, when he found a well. He climbed… |
|  | Muslim 5860 *(also)* | Abu Huraira reported Allah's Messenger (may pace be upon him) as saying:A prostitute saw a dog moving around a well on a hot day and hanging out… |
|  | Muslim 5861 *(also)* | Abu Huraira reported Allah's Messenger (ﷺ) as saying:There was a dog moving around a well whom thirst would have killed. Suddenly a prostitute… |
|  | Abu Dawud 2550 *(also)* | Abu Hurairah reported the Apostle of Allaah(ﷺ) as saying “ While a man was going on his way, he felt himself thirsty severely. He found a well… |
| the best of you learn the Quran and teach it | Bukhari 5027 | The Prophet (ﷺ) said, "The best among you (Muslims) are those who learn the Qur'an and teach it |
| cleanliness is half of faith | Muslim 534 | Abu Malik at-Ash'ari reported:The Messenger of Allah (ﷺ) said: Cleanliness is half of faith and al-Hamdu Lillah (all praise and gratitude is for… |
| advice: do not become angry | Bukhari 6116 | A man said to the Prophet (ﷺ) , "Advise me! "The Prophet (ﷺ) said, "Do not become angry and furious." The man asked (the same) again and again,… |
| the religion is easy, do not make it hard | Bukhari 39 | The Prophet (ﷺ) said, "Religion is very easy and whoever overburdens himself in his religion will not be able to continue in that way. So you… |
| removing something harmful from the road | Muslim 6670 | Abu Huraira reported Allah's Messenger (ﷺ) as saying:A person while walking along the path saw the branches of a tree lying there. He said: By… |
|  | Muslim 6673 | Abu Barza reported:I said: Allah's Messenger, teach me something so that I may derive benefit from it. He said: Remove the troublesome thing from… |
|  | Muslim 153 | It is narrated on the authority of Abu Huraira that the Messenger of Allah (may peace and blessings be upon him) said:Faith has over seventy… |
|  | Tirmidhi 2614 *(also)* | that the Messenger of Allah (ﷺ) said: "Faith has seventy-some odd doors, the lowest of which is removing something harmful from the road, and its… |
|  | Bukhari 652 *(also)* | Allah's Messenger (ﷺ) said, "While a man was going on a way, he saw a thorny branch and removed it from the way and Allah became pleased by his… |
|  | Bukhari 653 *(also)* | Allah's Messenger (ﷺ) said, "While a man was going on a way, he saw a thorny branch and removed it from the way and Allah became pleased by his… |
|  | Bukhari 654 *(also)* | Allah's Messenger (ﷺ) said, "While a man was going on a way, he saw a thorny branch and removed it from the way and Allah became pleased by his… |
|  | Bukhari 2472 *(also)* | Allah's Messenger (ﷺ) said, "While a man was on the way, he found a thorny branch of a tree there on the way and removed it. Allah thanked him… |
|  | Bukhari 2989 *(also)* | Allah's Messenger (ﷺ) said, "There is a (compulsory) Sadaqa (charity) to be given for every joint of the human body (as a sign of gratitude to… |
|  | Muslim 2335 *(also)* | Hammam b. Munabbih reported that-this is out of (those ahadith) which Abu Huraira narrated to us from Muhammad, the Messenger of Allah (ﷺ). And… |
|  | Muslim 6674 *(also)* | Abu Barza reported that he said to Allah's Messenger (ﷺ):Allah's Messenger, I do not know whether I would survive after you, so confer upon me… |
| paradise is at the feet of your mother | Nasa'i 3104 | It was narrated from Mu'awiyah bin Jahimah As-Sulami, that Jahimah came to the Prophet (ﷺ) and said:"O Messenger of Allah! I want to go out and… |
| who most deserves my good company? your mother | Bukhari 5971 | A man came to Allah's Messenger (ﷺ) and said, "O Allah's Messenger (ﷺ)! Who is more entitled to be treated with the best companionship by me?"… |
| a Muslim is one whom others are safe from his tongue and hands | Bukhari 10 | The Prophet (ﷺ) said, "A Muslim is the one who avoids harming Muslims with his tongue and hands. And a Muhajir (emigrant) is the one who gives up… |
|  | Bukhari 11 *(also)* | Some people asked Allah's Messenger (ﷺ), "Whose Islam is the best? i.e. (Who is a very good Muslim)?" He replied, "One who avoids harming the… |
| live in this world as if you were a stranger or a traveller | Bukhari 6416 | `Abdullah bin `Umar said, "Allah's Messenger (ﷺ) took hold of my shoulder and said, 'Be in this world as if you were a stranger or a traveler."… |
| the most beloved deeds are regular ones even if few | Bukhari 6464 | Allah's Messenger (ﷺ) said, "Do good deeds properly, sincerely and moderately and know that your deeds will not make you enter Paradise, and that… |
| honour your guest | Bukhari 6019 | My ears heard and my eyes saw the Prophet (ﷺ) when he spoke, "Anybody who believes in Allah and the Last Day, should serve his neighbor… |
|  | Bukhari 6136 *(also)* | The Prophet (ﷺ) said, "Whoever believes in Allah and the Last Day, should not hurt his neighbor and whoever believes in Allah and the Last Day,… |
|  | Bukhari 6138 *(also)* | The Prophet (ﷺ) said, "Whoever believes in Allah and the Last Day, should serve his guest generously; and whoever believes in Allah and the Last… |
| you may only envy two kinds of people | Bukhari 73 | The Prophet (ﷺ) said, "Do not wish to be like anyone except in two cases. (The first is) A person, whom Allah has given wealth and he spends it… |
|  | Bukhari 1409 *(also)* | I heard the Prophet (ﷺ) saying, "There is no envy except in two: a person whom Allah has given wealth and he spends it in the right way, and a… |
|  | Muslim 1894 *(also)* | Salim narrated on the authority of his father (Ibn 'Umar) that the Messenger of Allah (ﷺ) said:Envy is not justified but in case of two persons… |
|  | Muslim 1895 *(also)* | Salim son of Abdullah b. 'Umar is reported to have said on the authority of his father that the Messenger of Allah (ﷺ) observed:Envy is not… |
|  | Muslim 1896 *(also)* | Abdullah b. Mas'ud reported Allah's Messenger (ﷺ) as saying:There should be no envy but only in case of two persons: one having been endowed with… |
| fasting Ramadan with faith forgives past sins | Bukhari 38 | Allah's Messenger (ﷺ) said, "Whoever observes fasts during the month of Ramadan out of sincere faith, and hoping to attain Allah's rewards, then… |
| Allah descends in the last third of the night | Bukhari 1145 | Allah's Messenger (ﷺ) said, "Our Lord, the Blessed, the Superior, comes every night down on the nearest Heaven to us when the last third of the… |
| be merciful to those on earth and the One in heaven will be merciful to you | Tirmidhi 1924 | Abdullah bin 'Amr narrated that the Messenger of Allah said:"The merciful are shown mercy by Ar-Rahman. Be merciful on the earth, and you will be… |
| on judgement day we will be asked about our life, youth, wealth and knowledge | Tirmidhi 2416 | Ibn Mas'ud narrated that the Messenger of Allah SAW said:"The feet of the son of Adam shall not move from before his Lord on the Day of… |
|  | Tirmidhi 2417 *(also)* | Abu Barzah Al-Aslami narrated that the Messenger of Allah (s.a.w) said:"The feet of the slave of Allah shall not move [on the Day of Judgement]… |
