# Lesson Exemplars for Finite Math 2

## ACADEMIC ELECTIVE

-----

#### Lesson Exemplar for Finite Mathematics 2

This material is intended exclusively for the use of senior high school teachers participating in the implementation of the Strengthened Senior High School

**Curriculum. It aims to assist in delivering the curriculum content, standards, and lesson competencies. Any unauthorized reproduction, distribution, modification, or**

utilization of this material beyond the designated scope is strictly prohibited and may result in appropriate legal actions and disciplinary measures. Borrowed content included in this material is owned by their respective copyright holders. Every effort has been made to locate and obtain permission to use these materials from their respective copyright owners. The publisher and development team do not represent nor claim ownership over them.

---

###### Development Team

**Writers:** Patrick F. Pelimer, Allen James R. Barlis, Melvin P. Bahain, Precious

Isabel V. Saludes, Michelle C. Cruz, Jean L. Bataller, Nessa S. Loveres, Daniel C. Geraldez, Niezy Mae H. Postrero, Kent A. Chan **Validators:** Earl John D. Ares, Nerwyn Z. Samoro, James Rey G. Saludares,

Emmaylou J. Yacapin, Raffy U. Fanuncio, Ruel D. Licanto, Gemma S. Singson

###### Consultant: Haidee P. Rosete

University of the Philippines - National Institute for Science and Mathematics Education

###### Learning Area Specialist: Wilson R. Santiago

Senior Education Program Specialist Bureau of Learning Delivery - Teaching and Learning Division

Bureau of Learning Delivery Bureau of Curriculum Development Bureau of Learning Resources

---

Every care has been taken to ensure the accuracy of the information provided in this material. For queries or clarifications, you may contact the Bureau of Learning Resources - Office of the Director at blr.od@deped.gov.ph or via telephone at (02) 8634-1072. If you have feedback on the LE, please accomplish this form, which may be accessed through the following link: https://bit.ly/sshsfeedbackform.

-----

### TABLE OF CONTENTS

**Lesson No. Title Pages**

| Unit 1. | Counting Techniques | 1 - 2 |
|---|---|---|
| 1.1 | The Addition and Multiplication Principles of Counting | 2 - 13 |
| 1.2 | Permutations of Distinct Objects | 14 - 24 |
| 1.3 | Combinations of Distinct Objects | 24 - 33 |
| 1.4 | Permutations with Repetition and Circular Arrangements | 33 - 44 |
| 1.5 | Combinatorial Counting Techniques and Their Applications | 45 - 57 |

| Unit 2. | Probability | 57 - 58 |
|---|---|---|
| 2.1 | Probability of an Event | 58 - 67 |
| 2.2 | Addition of Probabilities | 67 - 77 |
| 2.3 | Independent Events | 77 - 88 |
| 2.4 | Conditional Probability | 88 - 99 |
| 2.5 | Bayes' Rule | 99 - 109 |

3.1 3.2 3.3

3.4 3.5 3.6 3.7

**Unit 3. Number Theory**

Divisibility and Its Properties Primes, Fundamental Theorem of Arithmetic, and Prime Factorization Computing the Greatest Common Divisor (GCD) and Least Common Multiple (LCM) of Two Positive Integers Using Prime Factorization and the Euclidean Algorithm Solving Linear Diophantine Equations Using the Euclidean Algorithm Congruence Modulo m: Properties and Modular Arithmetic Operations Solving Linear Congruences Applications of Modular Arithmetic in Real-World Verification Systems

**109 - 110**

110 - 122 122 - 132 133 - 143

144 - 154 154 - 164 164 - 174 174 - 185

| Unit 4. | Networks and Graphs | 185 - 187 |
|---|---|---|
| 4.1 | Fundamental Concepts of Graph Theory | 187 - 199 |
| 4.2 | Eulerian Paths and Circuits | 199 - 210 |
| 4.3 | Hamiltonian Paths and Circuits | 210 - 223 |
| 4.4 | Spanning Trees with BFS and DFS | 223 - 236 |
| 4.5 | Shortest Paths with Dijkstra and Floyd-Warshall | 236 - 249 |
| Teachers | Notes | http://bit.ly/4eXc6XL |

iii

-----

###### UNIT 1. COUNTING TECHNIQUES

| I. LEARNING | GOALS |
|---|---|
| Content Standard | The learners demonstrate knowledge and understanding of the Fundamental Principles of Counting and of permutations and combinations as systematic methods for determining the number of ways to select, arrange, and distribute objects. |
| Performance Standard | By the end of the unit, the learners are able to apply combinations and permutations in counting the number of ways to select and arrange objects. |
| Learning Competencies | The learners: 1. use the addition and multiplication principles to count elements of a set; 2. differentiate between a combination and a permutation of objects; 3. calculate the number of combinations and permutations of n objects taken k at a time; 4. apply the properties of combinations to count the elements of a set; 5. solve problems involving combinations and permutations; 6. compute the number of ways of arranging a. a set with non-distinct elements b. a set of objects in a circle; 7. compute the number of ways of distributing objects (distinct and non-distinct) into groups; 8. solve counting problems using combinatorial techniques; |
| II. REFERENCES | and MATERIALS |
| Textbook and Modules | • Barnett, R., Ziegler, M., & Byleen, K. (2018). Finite mathematics for business, economics, life sciences, and social sciences (13th ed.). Pearson. • Blitzer, R. (2018). Thinking mathematically (7th ed.). Pearson. • Bluman, A. G. (2017). Elementary statistics: A step by step approach (10th ed.). McGraw-Hill Education. https://drive.uqu.edu.sa/_/mskhayat/files/MySubjects/2017SS%20Elementary%20Statistics/Elementary%20Statistics.pdf • Brualdi, R. A. (2010). Introductory combinatorics (5th ed.). Pearson. • Department of Education (DepEd). (2015). Mathematics 10 Learner's Module Unit 3 First Edition, Department of Education. • Department of Education (DepEd). (2015). Mathematics 10 Teacher's Guide Unit 3 First Edition, Department of Education. • Department of Education. (2020). Mathematics - Grade 8, Quarter 4, Module 7: Counting methods and techniques in an experiment. DepEd Caraga Region. • Department of Education. (2020). Mathematics 10: Quarter 3 - Module 26: Linear permutation of distinguishable objects. DepEd - Cordillera Administrative Region. • Department of Education. (2020). Mathematics 10: Quarter 3 - Module 27: Permutation of identical objects and circular permutation. DepEd Learning Portal. • Department of Education. (2020). Mathematics 10: Quarter 3 - Module 28: Combination. DepEd Learning Portal. • Department of Education. (2022). Mathematics 10: Quarter 3 - Modules 26-32: Permutations, combinations, and probability. DepEd Learning Portal. • Epp, S. (2019). Discrete mathematics with applications (5th ed.). Cengage Learning. • Epp, S. S. (2011). Discrete mathematics with applications (4th ed.). Cengage Learning. • Gerstein, L. J. (1996). Introduction to mathematical structures and proofs. Springer. https://doi.org/10.1007/978-1-4684-6708-6_5 • Graham, R. L., Knuth, D. E., & Patashnik, O. (1994). Concrete mathematics: A foundation for computer science (2nd ed.). Addison- Wesley. https://seriouscomputerist.atariverse.com/media/pdf/book/Concrete%20Mathematics.pdf • Grimaldi, R. P. (2018). Discrete and combinatorial mathematics: An applied introduction (5th ed.). Pearson. https://dokumen.pub/discrete-and-combinatorial-mathematics-an-applied-introduction-5nbsped-0321385020-9780321385024.html • https://www.ms.uky.edu/~sohum/putnam/enu_comb_stanley.pdf • Johnsonbaugh, R. (2017). Discrete mathematics (8th ed.). Pearson. https://broman.dev/download/Discrete%20Mathematics%208th%20Edition.pdf |

-----

|  | • Kwong, H. (2021). A spiral workbook for discrete mathematics. SUNY Geneseo. https://knightscholar.geneseo.edu/oer-ost/10/ • Levin, O. (2020). Discrete mathematics: An open introduction (3rd ed.). University of Northern Colorado. https://discrete.openmathbooks.org/dmoi3/ch_counting.html • Lial, M. L., Greenwell, R. N., & Ritchey, N. P. (2019). Finite mathematics and its applications (12th ed.). Pearson. • Rosen, K. H. (2019). Discrete mathematics and its applications (8th ed.). McGraw-Hill Education. https://faculty.ksu.edu.sa/sites/default/files/%5BBook%5D%20Discrete%20mathematics%20and%20its%20applications%20%2820 19%29_0.pdf • Stanley, R. P. (1997). Enumerative combinatorics (Vol. 1). Cambridge University Press. • Stewart, J. (2016). Calculus: Early transcendentals (8th ed.). Cengage Learning. (for foundational counting applications in probability contexts) https://www.mymathscloud.com/api/download/modules/AP-Calculus/Textbooks/Calculus%20Stewart.pdf?id=149258416 |
|---|---|
| Websites | • Math Is Fun: Permutations and Combinations. https://www.mathsisfun.com/combinatorics/combinations-permutations.html • BetterExplained: Easy Permutations and Combinations. https://betterexplained.com/articles/easy-permutations-and-combinations/ • Wolfram MathWorld: Combinatorics. https://mathworld.wolfram.com/Combinatorics.html • GeeksforGeeks https://www.geeksforgeeks.org/maths/circular-permutation/ • Khan Academy. (n.d.). Permutations and combinations. Khan Academy. https://www.khanacademy.org/math/statistics- probability/probability-library • Wolfram MathWorld. (n.d.). Permutation; Circular permutation. Wolfram Research. https://mathworld.wolfram.com/Permutation.html • Cuemath https://www.cuemath.com/data/permutations-and-combinations/ https://www.khanacademy.org/math/statistics-probability/counting-permutations-and-combinations |
| Video Lessons | • LMKMaths (2015). 01 The Addition and Multiplication Principles. Youtube. https://youtu.be/yTsbGglDo04 • The Organic Chemistry Tutor (2023). The Fundamental Counting Principle. Youtube. https://youtu.be/3lmEqp8VhAU • WOW MATH (2021). Fundamental Principle of Counting \|\| Grade 10 Mathematics Q3. Youtube. https://youtu.be/va30DhdstgY The Organic Chemistry Tutor (2017). Permutations and Combinations Tutorial. Youtube. https://youtu.be/XJnIdRXUi7A |
| Materials and EdTech | • Calculator • Printed worksheets • Whiteboard/ marker or projector • Role cards/word/cards/ labels • PowerPoint Presentation/ Canva • GeoGebra - for visualizing permutations and combinations. • Desmos - interactive graphing to model factorial growth. • Kahoot/Quizizz - gamified quizzes on permutations and combinations. |
| AI Declaration | In preparing this Learning Exemplar (LE), the author(s) used generative artificial intelligence (Gemini, ChatGPT, Microsoft Copilot) tools to assist in organizing ideas, developing sample activities, and generating formative assessment items. The author(s) carefully reviewed, validated, and finalized all content. The author(s) take full responsibility for the content of this LE. |
| III. CONTENT | Lesson 1.1. The Addition and Multiplication Principles of Counting |
| IV. OBJECTIVES | By the end of the lesson, learners are expected to: 1. list outcomes of simple counting situations using systematic enumeration (tree diagrams, ordered lists); 2. recognize from worked examples when outcomes are mutually exclusive and require addition; 3. state the addition principle from observed patterns: if A and B are disjoint, then \|A ∪ B\| = \|A\| + \|B\|; 4. recognize from worked examples when choices are made in stages and require multiplication; 5. state the multiplication principle from observed patterns: if a task can be performed in m ways and a second task in n ways, then both tasks can be performed in m × n ways; 6. apply the addition and multiplication principles to count elements of finite sets in real-world contexts; and 7. distinguish situations requiring addition from those requiring multiplication based on whether choices are exclusive or sequential. |
| V. PROCEDURES | LEARNERS ACTIVITIES ANNOTATION |

-----

| A. Activating | A.1. Eliciting Prior Knowledge |  |
|---|---|---|
| Prior Knowledge | Activity A.1. Leveling Learners' Readiness Listing the Possibilities Instructions: Work on your own. Read the situation, then answer the questions using an organized list and a simple tree diagram. A small canteen sells 2 ulam (Adobo, Tinola) and 3 drinks (Water, Juice, Milk). 1. Suppose you may take exactly one item, either one ulam or one drink. List all the item you could choose, then state how many items are on your list. 2. Suppose you take one ulam and one drink as a meal. Make an organized list of all possible ulam-and-drink pairs, then state the total number of pairs. 3. Draw a simple tree diagram for the meal in item 2. Let the first set of branches represent the ulam and the second set of branches represent for the drinks. Processing Questions: 1. How did you ensure that your list in item 2 included every possible pair without any repetitions? 2. How does your tree diagram show the same pairs listed in your organized list? 3. Before this lesson, where have you used an organized list or a tree diagram? |  |

###### Activity A.1. Leveling Learners' Readiness

**Purpose: Recall systematic enumeration through organized lists and**

tree diagrams, which is the prior skill that this lesson formalizes. This check assesses learner's readiness B.1 and B.2 and identifies gaps in organized counting before the principles are introduced.

###### Strategy: Silent Individual Recall

Learners reconstruct their listing skill from memory so the teacher can determine who can already enumerate completely.

###### Procedure for the teacher:

1. Display the situation and give learners three minutes of silent individual work.
2. Circulate and check whether learners have listed pairs in an organized order rather than at random.
3. Invite two or three learners to show a list and a tree diagram on the board.
4. Do not yet name addition or multiplication. Keep the focus on complete, organized listing.

###### Answer to the task:

- Item 1: one item from {Adobo, Tinola, Water, Juice, Milk}; the list contains 5 items.
- Item 2: pairs are Adobo-Water, Adobo-Juice, Adobo-Milk, Tinola-Water, Tinola-Juice, Tinola-Milk; that is 6 pairs.
- Item 3: the completed tree appears in Figure 1. It has 2 first branches (the ulam), each splitting into 3 (the drinks), so its 6 leaves are the 6 meals listed in item 2.

![](img_p6_1.png)

-----

| A.2. Establishing the Purpose of the Lesson | Figure 1. Tree diagram for the canteen meal (2 ulam × 3 drinks), showing the 6 possible meals. Facilitating Reflection: • PQ1. Intent: surface a systematic method (fix one ulam, then vary the drinks). Answer: learners describe ordering or grouping that guarantees completeness. • PQ2. Intent: link list and tree. Answer: each path from the root to a leaf is one pair in the list. • PQ3. Intent: connect to prior experience. Answer: menus, schedules, or outfit choices listed before. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Designing the Intramurals Shirt Instructions: Read the scenario and answer the questions to understand why a counting method is useful. Your class will design an intramurals shirt. A complete design needs one color (White, Navy Blue, Ash Gray), one print (Logo Only or Text Only), and one sleeve type (Short Sleeve or Long Sleeve). Figure 2. The option categories from which a complete intramurals shirt design is drawn. 1. Begin listing the possible complete designs, where each design has one color, one print, and one sleeve type. Try to list all of them. 2. Before you finish the full list, can you determine how many complete designs are possible? Describe a faster way to find the total. Note: There is a quick way to find the total without listing every design. We will name this method later in the lesson. Processing Questions: 1. What is this task asking you to find? | Activity A.2. Appreciating Lesson Relevance Purpose: Set the lesson purpose using a scenario in which hand- listing every complete design becomes tedious. The need to find the total more quickly motivates the introduction of the principles. The phase is motivational and orienting, not exploratory. Strategy: Partial-List-then-Predict Learners begin an exhaustive list, see it becoming longer, and are asked to predict the total without completing it. Procedure for the teacher: 1. Present this one scenario only. Have students begin the list individually for about four minutes. 2. Pause the class once lists lengthen and ask, by a show of hands, who has found all the designs. 3. Ask for a faster way to get the total. Accept informal ideas; do not yet teach the formula. Answer to the task: there are 3 × 2 × 2 = 12 complete designs. Listing all 12 is possible but slow, which is the gap that the lesson closes. Facilitating Reflection: • PQ1. Intent: state the goal. Answer: count the number of complete shirt designs. |

![](img_p7_1.png)

-----

2. Which part of the task becomes difficult when using listing alone?

| B. Instituting | B.1. Presenting Examples |  |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Game Avatar Designer Instructions: You are designing a character for a mobile game. Use the options below to answer the tasks. Materials: • Outfits: Space Suit, Knight Armor, Wizard Robe • Pet companions: Robotic Owl, Fire Dragon Figure 3. The avatar option sets used for the task. 1. Starter Gift. The game lets you choose exactly one free item- either one outfit or one pet. List every gift option and state how many there are. 2. Profile Look. Your final avatar must have one outfit and one pet. List every unique avatar pair, draw a tree diagram, and state how many pairs there are. 3. Compare. Which task allowed you to choose one item from a single combined pile, and which task required you to pair one item from each group? Processing Questions: 1. What stays the same and what changes between the Starter Gift task and the Profile Look task? 2. In the Starter Gift task, why does picking the Space Suit use up your one pick? In the Profile Look, why does choosing the Space Suit still leave you with a pet to choose? 3. If the developers add a third pet, how does each total change? Which total grows faster, and why? 4. In your own words, state the rule for when to add the counts and when to multiply them. |  |

- PQ2. Intent: locate the difficulty. Answer: writing out every color-print-sleeve combination by hand is slow and error prone.

###### Activity B.1. Exploring Key Concepts

**Purpose: Let learners discern the critical feature through a varied set**

of examples: an exclusive single choice calls for addition, while a staged paired choice calls for multiplication.

**Strategy: Compare-and-Contrast with a Variation Set**

Keep the option groups fixed (3 outfits and 2 pets) and vary only the connector (one item from a combined pile versus one from each group). A non-example anchors the boundary of multiplication.

###### Example space (for the teacher):

- Addition instance: Choose one item from the combined pile of outfits or pets. 3 + 2 = 5.
- Multiplication instance: Choose one outfit and one pet. 3 × 2 = 6.
- Non-example for multiplication: Choose one outfit from the 3 outfits. There is only one stage, so nothing is multiplied; the answer is 3, obtained by listing.

###### Procedure for the teacher:

1. Project the options. Have students work for about five minutes,

using initials to speed up the listing process.

2. Direct attention to the connector word and to how many groups

a choice draws from.

3. Use the non-example to show that multiplication needs a genuine second stage.

**Answer to the task: Starter Gift = 3 + 2 = 5 options; Profile Look = 3**

× 2 = 6 pairs. The completed tree for the Profile Look appears in Figure 4.

-----

![](img_p9_1.png)

###### B.2. Discussing the Concept

###### Activity B.2. Deepening Conceptual Understanding Addition Principle

The Addition Principle is used when you choose exactly one item from several separate groups with no items in common. Such groups give mutually exclusive choices: choosing from one group rules out the others.

**Definition: If one task can be done in m ways and a second task in**

n ways, and the two cannot be done at the same time, then there are m + n ways to do either the first task or the second task. In set language, if A and B are disjoint, then |A ∪ B| = |A| + |B|.

*Figure 4. Tree diagram for the avatar Profile Look (3 outfits × 2 pets),* showing the 6 possible avatars.

###### Facilitating Reflection:

- PQ1. Intent: identify invariant and varying features. Answer: groups stay the same; the connector and the number of groups used change.
- PQ2. Intent: exclusivity versus independence. Answer: one pick is used up in the gift; the pair task keeps a separate pet choice.
- PQ3. Intent: rate of growth. Answer: the gift total rises by 1 (to 6), the pair total rises by 3 (to 9); multiplication grows faster.
- PQ4. Intent: articulate the rule. Answer: add when choosing one item from separate piles; multiply when choosing one from each of several stages.

###### Activity B.2. Deepening Conceptual Understanding

###### Big Ideas: the Addition Principle counts a single choice across disjoint

groups, while the Multiplication Principle counts choices made stage by stage. Combined problems require multiplication within each case and addition across mutually exclusive cases.

###### Strategy: Guided Lecture with Think-Alouds

Read each worked example aloud, then think through the counting process aloud before stating the formula.

###### Definitional strand: define mutually exclusive, disjoint, and stage;

introduce the notation |A ∪ B| = |A| + |B| and m × n. Likely

-----

###### Worked Example: The Library Choice

A shelf has 5 mystery books and 8 science fiction books. You may borrow only one book. Since you choose either a mystery book or a science fiction book, there are 5 + 8 = 13 possible choices.

###### Processing Questions:

1. If you choose a mystery book in this one-borrow situation, can

you also choose a science fiction book? Why does this lead

you to add?

2. Why does the rule require the two groups to have no books in

common?

###### Multiplication Principle

The Multiplication Principle is used when a task is completed in a sequence of stages, and a choice is made at each stage.

###### Definition: if there are m ways to do one thing and, after it is done,

n ways to do a second thing, then there are m × n ways to do both in sequence.

**Note: The product m × n works only when the number of second-**

stage choices is the same for every first-stage choice. The specific choices may differ, but their count must stay the same. If that count changes depending on the first choice, do not multiply; count each case and add the results.

###### Worked Example: Password Creator

A 2-character code has a first character from {A, B, C} (3 ways) and a second character from {0, 1, 2, 3, 4} (5 ways). To complete the code, you pick a letter and a number, so there are 3 × 5 = 15 codes. The 15 codes are A0, A1, A2, A3, A4, B0, B1, B2, B3, B4, C0, C1, C2, C3, C4. The Multiplication Principle applies here because each of the 3 letters is followed by the same 5-digit choices, so the count of second-stage choices does not change.

misconception: treating overlapping groups as disjoint. Teacher move: ask whether any single item belongs to both groups before adding.

###### Relational strand: tie the lesson to A.1 listing and trees and to the

B.1 distinction. Likely misconception: seeing multiplication as merely a larger addition. Teacher move: point to the branching tree in Figure 5, where each first choice leads to a full set of second choices.

###### Procedural strand: addition adds group sizes; multiplication

multiplies stage counts; combined problems multiply within a case and then add across cases. Likely misconception: Adding all raw numbers in a combined problem, for example, 3 + 2 + 4 + 3. Teacher move: box each package first, then add the boxed totals.

**Answer to the task: Library = 5 + 8 = 13; Password = 3 × 5 = 15;**

Sponsor Prize = 6 + 12 = 18; Travel Itinerary = 6 + 4 = 10.

###### Facilitating Reflection:

- Addition PQ1. Answer: no; one borrow is used up, so the groups are pooled and added.
- Addition PQ2. Answer: a shared item would be counted twice, so disjoint groups keep the count exact.
- Multiplication PQ1. Answer: 3 + 5 = 8 counts the letters and digits separately, not the 15 letter-and-digit pairs.
- Multiplication PQ2. Answer: each of the 3 letters branches into all 5 digits, so the leaves number 3 × 5 = 15.
- Combining PQ1. Answer: each case is a set built in stages, so its size is a product; the cases are then separate options to add.
- Combining PQ2. Answer: the word or (Sponsor A or B; Option 1 or 2) signals the final addition, but only because the cases are mutually exclusive; check that they cannot happen at the same time before adding.

*Teacher's Technical Note: the Multiplication Principle as stated assumes the number of second-stage choices does not depend on which firststage choice was made. In all examples here that count is constant, so the product applies.*

-----

![](img_p11_1.png)

*Figure 5. Tree diagram for the two-character code, showing 3 × 5 =*

15 possible outcomes.

**When the Multiplication Principle does not apply: Suppose a 2-**

character code has a first character from {A, B}. If the first character is A, the second character can be 1 or 2 (2 choices). If it is B, the second character can be 1, 2, or 3 (3 choices). The number of second choices is not the same for both first characters, so you cannot multiply. Count each case and add: 2 + 3 = 5 codes (A1, A2, B1, B2, B3).

###### Processing Questions:

1. Why would 3 + 5 give the wrong total here?
2. Looking at the tree diagram, how does multiplication account for the pairing of every letter with every number?

###### Table Guide for the Two Principles

| Principle | Logic |
|---|---|
| Addition | You are choosing exactly one item |
| Multiplication | You are building one complete |

from one of several non-overlapping groups. Add the group counts only when no outcome belongs to more than one group.

outcome in stages, with one choice made at each stage.

-----

| Combining the Two Principles Some problems use both principles. This occurs when a task can be completed through separate cases, and each case has its own stages. Worked Example: Sponsor Prize A winner chooses one prize package from one of two sponsors. Sponsor A offers 3 tablets and 2 pairs of headphones. Choosing one of each give 3 × 2 = 6 packages. Sponsor B offers 4 jerseys and 3 gym bags. Choosing one of each gives 4 × 3 = 12 packages. Since the winner takes Sponsor A or Sponsor B, the total is 6 + 12 = 18 packages. Worked Example: Travel Itinerary You travel from City A to City C. Option 1 is a bus then a train: 3 bus routes and 2 train routes give 3 × 2 = 6 routes. Option 2 is a direct flight with 4 possible routes. Since you take Option 1 or Option 2, the total is 6 + 4 = 10 ways. Processing Questions: 1. Why must you multiply within each package or option before adding across them? 2. What word in each problem signals the final addition? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheets.) |
| Activity B.3. Purpose: Build fluency through a set sequenced by structural variation, Variation principle: Items 1 to 2 keep a single exclusive choice each of two stages (multiplication); items 5 to 6 combine both, criterion: correct items 1 to 4 before moving to C.1. Strategy: I do, We do, You do Model items 1 and 2 with the class (I do, We do), then release items Procedure for the teacher: 1. Have students decide, before computing, whether each result is 2. For items 5 and 6, prompt students to build each case with 3. Collect the Exit Ticket to check the addition-versus-multiplication Answer to the task: • Item 1: 6 + 4 = 10 (addition; one elective). | Practicing Learned Skills not surface difficulty. (addition) while varying the groups; items 3 to 4 move to one choice from multiplying within each case and adding across cases. Minimum success 3 to 6 and the Exit Ticket for independent work (You do). a single item or a combination. multiplication, then add the case totals. decision. |

-----

| C. | • Item 2: 4 × 10 = 40 (multiplication; letter then digit). • Item 3: 3 + 5 = 8 (addition; one ride). • Item 4: 5 × 3 = 15 (multiplication; sandwich and drink). • Item 5: 3 × 2 = 6 and 4 × 3 = 12, then 6 + 12 = 18 (both). • Item 6: 5 × 4 = 20 and 6 × 2 = 12, then 20 + 12 = 32 (both). • Exit Ticket 1: 4 + 3 = 7 (addition). Exit Ticket 2: 5 × 4 = 20 Facilitating Reflection: • PQ1. Answer: single-item results (items 1, 3, and Exit 1) signal multiplication. • PQ2. Answer: each new option in a stage opens a whole new set • PQ3. Answer: a complete set is built by multiplication, then C.1. Finding Practical Application | (multiplication). addition; combination results (items 2, 4, and Exit 2) signal of pairings, so the total rises by a group rather than by one. becomes one option to add to the other case. |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Counting in the Neighborhood Instructions: Analyze each scenario and apply the addition and multiplication principles. Show your solution. Merienda Choice A street-food vendor offers 5 fried skewers (Fishball, Kikiam, Kwek- kwek, Squidball, and Cheese Stick) and 3 cold drinks (Sago at Gulaman, Buko Juice, and Melon Juice). You have 20 pesos, which is exactly enough for one item. If you buy exactly one item to satisfy either your hunger or your thirst, how many options do you have? Daily Transportation You travel from your house to the plaza. First you take a tricycle to the highway, then a jeepney to the plaza. There are 4 tricycle drivers at your corner and 6 jeepney routes that pass through the plaza. How many unique ways can you complete the trip using one tricycle and one jeepney? Figure 6. The two-stage trip from house to plaza. | Activity C.1. Making Real-World Connections Purpose: Transfer the principles to authentic Filipino situations. This activity scaffolds the unit Performance Task: each scenario rehearses one Phase 1 item type. Strategy: Model-Eliciting Discussion Have students state the model (addition or multiplication) and the assumption behind it before computing, then compare strategies during the discussion. Procedure for the teacher: 1. For the Merienda, point to the one-item budget as the cue for addition. 2. For Daily Transportation, treat the trip as two linked stages that require multiplication. 3. For Buffet Strategy activity, determine the number of Heavy Meal combinations using multiplication first, then add the Quick Snack count. Answer to the task: Merienda = 5 + 3 = 8; Daily Transportation = 4 × 6 = 24; Buffet = (3 × 4) + 5 = 12 + 5 = 17. Facilitating Reflection: • PQ1. Answer: 10 counts a single ride; the trip needs both rides, so 24 counts every tricycle paired with every jeepney. • PQ2. Answer: the budget allows one item only, which makes the choice exclusive and the model additive. |

![](img_p13_1.png)

-----

| Buffet Strategy At a fiesta, a guest fills one plate. Option A (Heavy Meal): one of 3 rice varieties and one of 4 main dishes. Option B (Quick Snack): one of 5 native delicacies. If you choose either a complete Heavy Meal or a single Quick Snack, how many ways can you fill your plate? Processing Questions: 1. In the Daily Transportation task, why is 4 + 6 = 10 the wrong model? What does 24 represent that 10 does not? 2. Which assumption did you make about the 20-peso budget in the Merienda task, and how did it decide your operation? 3. As a vendor or fiesta host, which principle lets you offer many choices from few ingredients? Justify your answer. | • PQ3. Answer: multiplication, since pairing a few items across stages produces many combinations. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson Say the Rule in Your Own Words With your class, state the conclusion of the lesson. Use your own words and then test the rule using the questions below. Processing Questions: 1. In one sentence for each principle, state the Addition Principle asnd the Multiplication Principle. 2. What signal in a problem tells you to add, and what signals tell you to multiply, even when the words "and" or "or" are absent? 3. When does the Addition Principle not apply, and when does the Multiplication Principle not apply? 4. In a combined problem, how do you decide which quantities to multiply before performing the final addition? | Activity C.2. Wrapping up the Lesson Target conclusion (stated for the teacher): learners should express, verbally and symbolically, that the Addition Principle gives m + n ways for one choice from two disjoint groups, while the Multiplication Principle gives m × n ways for one choice at each of two stages. They should add the boundary: addition needs disjoint groups, multiplication needs a genuine second stage, and a combined problem multiplies within each case and adds across mutually exclusive cases. Strategy: Elicit, then Refine Eliciting prompt: ask, In one sentence, when do we add and when do we multiply? Fallback prompt: if a statement is partial, ask, At the end of the count, are you holding one item or a built pair or set? Use the answer to repair the rule. Answer to the task: see the target conclusion above; both principle statements with the stated boundaries. Facilitating Reflection: • PQ1. Answer: the two one-sentence statements above. • PQ2. Answer: a single exclusive choice signals addition; a result built from stages signals multiplication. • PQ3. Answer: addition fails when groups overlap; multiplication fails when there is only one stage. • PQ4. Answer: multiply within each self-contained case first, then add the case totals. |

-----

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheets.)***

###### Activity C.3. Assessing Learning Outcomes

**Purpose: Produce evidence of whether the lesson objectives have been met. No Processing Questions are used during the assessment. Item alignment: Part I covers Objectives 2 to 7. Part II covers Objectives 5 to 7. Part III covers Objectives 3, 4, 5, and 7. Objective 1,**

systematic enumeration, supports the listing in Part II.

###### Answer Key, Part I (Multiple Choice):

1. A. One item from a combined pool uses addition: 4 + 3 = 7.
2. B. A meal pairs a dish with a drink, so multiply: 3 × 4 = 12.
3. A. The two travel options are exclusive, so the count uses addition.
4. B. A letter then a digit is a two-stage choice: 26 × 10 = 260.
5. C. Routes to school use addition, then the gate uses multiplication: (2 + 3) × 4 = 20.

###### Answer Key, Part II (Constructed Response):

1. (a) One meal from a combined pool uses addition: 3 + 5 = 8. (b) One rice meal with one noodle meal uses multiplication: 3 × 5 = 15.
2. (a) A letter then two digits: 4 × 10 × 10 = 400. (b) Fixing the last digit as 0: 4 × 10 × 1 = 40.

###### Answer Key, Part III (True or False with Reasoning):

1. True. Choices made in sequence multiply, by the multiplication principle.
2. False. The addition principle applies to mutually exclusive options, not to options that can both occur.
3. False. Choosing exactly one item from a combined pool uses addition: 5 + 4 = 9. The product 5 × 4 counts shirt-and-pants pairs.
4. True. This is the multiplication principle for a two-stage task.
5. True. For disjoint sets, the union has no shared elements, so the sizes add.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

***C.4. Additional Activities (Complete instructions for the learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

###### For Remediation

###### Decision Map

**Purpose: Repair the add-or-multiply decision for learners who missed C.3, using a guided map and a drawn tree to make the multiplication**

structure visible.

-----

###### Strategy: Guided Decision Map

Walk each learner through the same map: name the result first (one item or a pair), then choose the operation.

###### Procedure for the teacher:

1. Have learners draw the shirt-to-pants lines before filling the blanks.
2. Connect each filled blank to the keyword (or, and) that drove it.

**Answer to each task: Item 1: 6 + 4 = 10 (one fruit, add). Item 2: the completed decision map appears in Figure 7, where each shirt joins**

every pair of pants, giving 2 × 3 = 6 outfits. Item 3: (a) or, addition; (b) and, multiplication.

![](img_p16_1.png)

*Figure 7. Decision map for the Sunday outfit (2 shirts × 3 pants), with one line from each shirt to every pair of pants, giving 6 outfits.*

**Facilitating Reflection: PQ1 intent: tie the operation to the keyword.**

Answer: or signals addition; and signals multiplication.

###### For Enhancement Multi-Step Counting

**Purpose: Stretch confident learners with combined-principle problems that anticipate the unit Performance Task. Strategy: Justify-Every-Step**

Require a one-line principle statement beside each computation, mirroring the PT requirement to name the technique.

###### Answer to each task:

- Item 1: Task 1 = 4 × 5 = 20 pairs (multiplication); Task 2 = 4 + 5 = 9 (addition).
- Item 2: custom = 3 × 2 × 3 = 18, ready-to-go = 5, total = 18 + 5 = 23 (both).
- Item 3: 2 × 3 = 6 plates (A1, A2, A3, B1, B2, B3); the list length matches the Multiplication Principle, since each letter pairs with each digit.

**Facilitating Reflection: PQ1 intent: justify the order of operations.**

Answer: a custom desktop is one built set (multiply), then the ready-to-go models are a separate option (add).

-----

| III. CONTENT |  |  |
|---|---|---|
| IV. OBJECTIVES | At the end of the lesson, the learners are will be able to: 1. investigate arrangements of small sets of distinct objects through problems; 2. define a permutation as an ordered arrangement of distinct 3. derive the formula P(n, k) = n! / (n - k)! by extending the multiplication 4. calculate P(n, k) using the formula and factorial notation; 5. verify computed values of P(n, k) by enumeration for small n and 6. identify problems where permutations apply by attending to 7. solve basic problems involving permutations of distinct objects | enumeration to recognize that order matters in some counting objects; principle inductively from small cases; k; whether the order of selection matters; and in real-world contexts. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Three Books on a Shelf Instructions: Work independently first, then compare with a partner. Be systematic so you miss none and repeat none. You have three distinct books: a Math book (M), a Science book (S), and an English book (E). Arrange all three books in a row on a shelf. 1. List every possible left-to-right arrangement of the three books. 2. State how many different arrangements you found. 3. Using the multiplication principle from Lesson 1.1, explain the count: how many choices for the first slot, then the second, then the third? Processing Questions: 1. Which principle from Lesson 1.1 explains why there are 6 arrangements, and how? 2. Is the arrangement MSE the same as EMS? Why or why not? |  |

###### Lesson 1.2. Permutations of Distinct Objects

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness

**Purpose: Recall systematic listing and the Multiplication Principle**

from Lesson 1.1, the prior skills this lesson formalizes. The check surfaces whether learners already treat a re-ordering as a new outcome, the readiness needed for B.1 and B.2.

###### Strategy: Individual-then-Pair Listing

Learners reconstruct the list from memory, then pair up to compare their work.

###### Procedure for the teacher:

1. Present the scenario and give three minutes of silent individual listing.
2. Circulate and check whether learners are listing the arrangement in an organized order rather than at random.
3. Invite two or three learners to show a list and a tree diagram on the board.
4. Do not introduce the term "permutation" yet. Connect the 6 to 3 × 2 × 1.

###### Answers to the task:

- The 6 arrangements are MSE, MES, SME, SEM, EMS, ESM.
- By the Multiplication Principle there are 3 × 2 × 1 = 6 arrangements: 3 choices for the first slot, 2 for the second, 1 for the last.
- The completed tree is in Figure 1; each path from Start to a leaf is one arrangement.

-----

![](img_p18_1.png)

*Figure 1. Tree diagram for arranging 3 distinct books, showing 3* × 2 × 1 = 6 arrangements.

###### Facilitating Reflection:

- PQ1. Intent: Connect the count to the multiplication principle. Answer: 3 × 2 × 1 = 6, since each filled slot leaves one fewer book for the next.
- PQ2. Intent: The surface that order matters. Answer: No, MSE and EMS use the same books in different orders, so they are different arrangements.

###### A.2. Establishing the Purpose of the Lesson

**Activity A.2. Appreciating Lesson Relevance Activity A.2. Appreciating Lesson Relevance**

**Podium Finishes Purpose: Set the lesson purpose with a scenario in which a swap**

changes the outcome. The felt difference between an ordered

**Instructions: Read the scenario and answer the questions to see why**

podium and an unordered group motivates permutations. The the order of a result can matter.

phase is motivational, not exploratory. A singing contest has 5 finalists: Anna, Ben, Carl, Dan, and Eve. There are three prizes: Champion (Gold), First Runner-Up (Silver), and **Strategy: Swap-and-Compare** Second Runner-Up (Bronze). Learners place three names in the prize slots, then swap two, and

judge whether the result changed.

![](img_p18_2.png)

###### Procedure for the teacher:

1. Present the scenario. Have learners place three names, then swap two, individually or as a quick simulation.
2. Ask whether the swap changed the outcome. Elicit the phrase order matters.
3. Preview that the lesson will compute such counts. Do not yet give the formula.

*Figure 2. The three ranked prize positions. Three finalists occupy* them, and the order matters.

-----

| B. Instituting | 1. Pick any three finalists and place them in the Gold, Silver, and Bronze positions. Now swap two of them. Is the result the same for the finalists? Explain. 2. Decide whether it matters who is named first, second, or third, and explain why. Note: Today, the lesson focuses on counting situations like this one, where the order of the objects matters. Processing Questions: 1. In this scenario, does the order of the winners matter? Why or why not? 2. If order matters, will there be more or fewer possible outcomes than simply choosing any 3 finalists without assigning prizes? Why? B.1. Presenting Examples | Answer to the task: swapping two winners changes who receives which prize, so it is a different result. Order matters because the three prizes are distinct. Facilitating Reflection: • PQ1. Intent: Name that order matters. Answer: yes; first, second, and third are different prizes, so a different order is a different outcome. • PQ2. Intent: Compare ordered and unordered counts. Answer: more outcomes, since each chosen set of 3 can be arranged in several orders; here 5 × 4 × 3 = 60 ordered results, far more than the unordered selections. |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Cracking the Code Instructions: Follow the steps with your teacher. You will discover the rule yourselves before it is introduced. You are setting a 3-digit passcode using the digits 1, 2, 3, 4, 5, with no digit repeated. Step 1. How many choices are there for the first digit? For the second? For the third? Multiply these numbers to find the total number of passcodes. Step 2. The product 5 × 4 × 3 is the start of 5!. Which factors are missing to reach 5! = 5 × 4 × 3 × 2 × 1? Step 3. Starting from 5!, what should you divide by so that only 5 × 4 × 3 is left? Step 4. You used n = 5 digits and chose k = 3. The leftover factor is 2 × 1 = 2!. How do you get the 2 from n and k? Write the rule for the count. Processing Questions: 1. How did the multiplication principle start the solution? 2. Why did you divide the full factorial by the factorial of the digits you did not use? | Activity B.1. Exploring Key Concepts Purpose: Derive the permutation formula from the Multiplication Principle using one concrete example. The example makes the structure visible: the full factorial divided by the factorial of the unused objects. This is guided-discovery activity, not a lecture. Strategy: Board-Built Derivation The teacher guides learners through the four steps, and the learners generate the rule, rather than receiving it as a ready-made formula. Procedure for the teacher: 1. Write the scenario. In Step 1, elicit 5 × 4 × 3 = 60 and connect each factor to its corresponding position. 2. In Step 2, have learners identify 5! and the missing factors 2 × 1. 3. In Step 3, lead them to divide 5! by 2! to cancel the tail. 4. In Step 4, connect 2 = 5 - 3 = n - k, so the divisor is (n - k)!. Draw Figure 3 on the board. Answer to the Task: 5 × 4 × 3 = 60; 5! = 120; so 60 = 120 / 2 = 5! / 2!. Since the unused factors are 2! = (5 - 3)! = (n - k)!, the rule is P(n, k) = n! / (n - k)!. The derivation is summarized in Figure 3. |

-----

![](img_p20_1.png)

###### B.2. Discussing the Concept

###### Activity B.2. Deepening Conceptual Understanding Defining the Permutation

###### A permutation is an ordered arrangement of distinct objects. The key

word is ordered: if changing the order produces a different outcome, such as a password or a race result, the count is a permutation.

###### Order matters in these examples: choosing a President and a Vice-

President from 4 students; forming a 2-digit number from 7, 8, 9 with no repeat. In each, swapping the two choices gives a different outcome.

**Formula. The number of permutations of n distinct objects taken k at**

a time is P(n, k) = n! / (n - k)!.

![](img_p20_2.png)

*Figure 4. The permutation formula: arrange all n objects, then divide* out the arrangements of the (n - k) you do not place.

*Figure 3. Building the passcode count: 5 × 4 × 3 = 60, bridged to* 5! / 2! = 5! / (5 - 3)!.

###### Facilitating Reflection:

- PQ1. Intent: locate the multiplication principle. Answer: each slot is a stage; 5 × 4 × 3 multiplies the choices available at each slot.
- PQ2. Intent: justify the division. Answer: 5! counts arrangements of all 5 digits; dividing by 2! removes the orderings of the 2 unused digits, leaving only the 3-digit codes. In other words, each code is counted 2! times, once for each order of the two leftover digits, so dividing by 2! keeps each code once.

###### Activity B.2. Deepening Conceptual Understanding

**Purpose: Formalize the definition and the formula derived in B.1,**

and show through enumeration that the formula matches direct counting. The worked examples model the cancellation technique.

**Strategy: Worked-Example Walkthrough with an Enumeration Check**

The teacher defines the term, works two computations, and proves the formula against a hand-listed case.

###### Procedure for the teacher:

1. Define permutation and stress the word ordered. Contrast picking two officers with picking two friends to sit together.
2. Show P(6, 2) and P(7, 3) on the board, pointing out how the (n - k)! in the denominator cancels the unused tail.
3. Do the P(3, 2) enumeration so learners see the 6 listed pairs match the formula.
4. Work the officers and PIN examples, naming why order matters in each.

-----

**Example 1. Answer to the task: P(6, 2) = 30; P(7, 3) = 210; P(3, 2) = 6 (matches**

6! the 6 listed pairs); P(10, 3) = 720; P(10, 4) = 5,040. (6,2) =

(6 -2)! **Facilitating Reflection:** 6! • PQ1. Intent: justify the denominator. =

4! Answer: n! orders all n objects; dividing by (n - k)! cancels 6 5 4! the orderings of the n - k objects left out, leaving only the = ordered selections of k.

4! • PQ2. Intent: sense of growth. = 6 5 Answer: more positions means more factors multiplied, so

the count grows; at k = n it equals n!, since (n - n)! = 0! = 1. = 3

**Example 2.**

7! (7,3) =

(7 -3)!

7!

=

4! 7 6 5 4!

=

4! = 7 6 5 = 210

**Example 3 (verify by enumeration). Take 2 letters from A, B, C. List:**

AB, AC, BA, BC, CA, CB = 6. Formula:

3! (3, 2) =

(3- 2)!

3!

=

1! 3 2 1

=

1

= 6 The two agree, so the formula is a shortcut for counting.

-----

| Permutations in the Real World Officers. From 10 students, the number of ways to elect a President, a Vice-President, and a Secretary is 10! (10, 3) = 7! 10 9 8 7! = 7! = 10 9 8 = 720 because the three roles are distinct, so order matters. PIN. The number of 4-digit PINs from 0 to 9 with no repeated digit is 10! (10, 4) = 4! 10 9 8 7 6 5 4! = 4! = 10 9 8 x 7 x 6 x 5 = 5,040 because the order of the digits matters. Key Takeaway: ask first, does order matter? If yes, and the objects are distinct and used once, use P(n, k). Processing Questions: 1. Why does dividing by (n - k)! give the count of ordered selections? 2. What happens to P(n, k) as k grows toward n, and why? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are on | the Learning Activity Sheet.) |
| Activity B.3. Practicing | Learned Skills |

**Purpose: Build fluency and sequence practice through structural variation: first the permutation-versus-selection contrast, then a small**

enumeration that the formula must match.

-----

###### Strategy: Guided Part I, Independent Part II

Part I is worked together as a classification with computation. Part II is done independently, listing before applying the formula.

###### Procedure for the teacher:

1. For each Part I item, ask whether reordering the chosen items changes the outcome.
2. Require learners to show the factorial expansion and the cancellation, not just the final number.
3. In Part II, insist on listing the outcomes before applying the formula, and watch for the omission of reversed pairs such as XW after WX.

###### Answer to the task: Part I.

- (a) NP. A committee is the same group regardless of the order picked.
- (b) P. The roles are distinct, so order matters. P(10, 3) = 10! / 7! = 10 × 9 × 8 = 720.
- (c) P. A password is ordered with no repeat. P(5, 4) = 5! / 1! = 5 × 4 × 3 × 2 = 120.
- (d) NP. The set of 4 books is the same regardless of the order picked.

**Part II. the 12 codes are WX, WY, WZ, XW, XY, XZ, YW, YX, YZ, ZW, ZX, ZY; the count is 12; and P(4, 2) = 4! / 2! = 4 × 3 = 12. The**

systematic listing is shown in Figure 5.

![](img_p23_1.png)

*Figure 5. Systematic listing of the two-letter codes formed from W, X, Y, and Z, giving 12 = P(4, 2).*

###### Facilitating Reflection:

- PQ1. Intent: Apply the order test to tell permutation (P) from non-permutation (NP). Answer: swapping two officers changes who holds which role, a different outcome, but swapping two committee members gives the same committee.
- PQ2. Intent: Name the systematic method. Answer: Fix the first letter, list every valid second letter, then move to the next first letter.

-----

| C. | C.1. Finding Practical Application |  |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Instructions: Read each situation, set up the appropriate permutation expression, and solve. Show your complete solution. 1. An artist has 8 paintings but has space to display only 4 of them in a row on a wall. In how many ways can the artist arrange 4 of the 8 paintings? 2. A tricycle ID code has 3 distinct letters and followed by 2 distinct digits from 0 to 9. From how many letters and digits are you choosing, respectively? Set up the permutation expression to determine the number of possible codes. You need not compute the final number. Processing Questions: 1. Give another real-life situation in which the order of an arrangement is critical, and explain why. | Activity C.1. Making Real-World Connections Purpose: Transfer the formula to authentic contexts and scaffold the unit Performance Task. Arranging artwork and building a coded ID are both permutation settings, since the order of the items changes the result. Strategy: Model-Eliciting Setup Learners identify n and k and justify why order matters before they compute, so technique selection becomes explicit. Procedure for the teacher: 1. For item 1, confirm n = 8 and k = 4 and that a row is ordered. 2. For item 2, elicit 26 letters and 10 digits, and that the two stages are multiplied. 3. Remind learners that 0 is a digit, so there are 10 digits, not 9. Answer to the task: • Item 1: P(8, 4) = 8! / 4! = 8 × 7 × 6 × 5 = 1,680 ways. • Item 2: choosing from 26 letters and 10 digits; by the multiplication principle the count is P(26, 3) × P(10, 2) = (26 × 25 × 24) × (10 × 9). The setup is the target; the value is 1,404,000. Facilitating Reflection: • PQ1. Intent: Generalize the concept to the learners' own lives. Answer: Examples such as race finishes, a playlist order, seating arrangements at a program, or a lock code, where reordering changes the result. |
|  | C.2. Making Generalization |  |
|  | Activity C.2. Wrapping up the Lesson Stating the Key Points Instructions: Complete each statement in your own words. 1. The multiplication principle is the foundation for counting ____. 2. A permutation is an arrangement in which ____ matters. 3. The count of ways to arrange k of n distinct objects is P(n, k) = ____. | Activity C.2. Wrapping up the Lesson Purpose: Learners state the generalization and its limitations: the formula assumes distinct objects, each used only once, where order matters. Strategy: Learner-Voiced Summary Learners supply the statements aloud. The teacher prompts only when an answer is partial. |

-----

###### Processing Questions:

1. If a classmate asked you what a permutation is, how would you explain it in one sentence?
2. What is the most important thing to settle before you put numbers into the formula?

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

|  | Procedure for the teacher: 1. Elicit the three statements from volunteers rather than reading them out. 2. If a learner stops at the formula, ask what makes two arrangements different. 3. State the boundary with a counterexample: a lock that allows repeated digits is not counted by P(n, k). Answer to the task: (1) arrangements; (2) order; (3) n! / (n - k)!. Facilitating Reflection: • PQ1. Intent: a plain-language definition. Answer: a permutation counts the ways to arrange items when the order changes the result. • PQ2. Intent: the decision before computing. Answer: decide whether order matters, and that the objects are distinct with no repeats, then identify n and k. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

**Purpose: Measure the objectives independently: classifying by order, computing P(n, k) with cancellation, verifying by enumeration, and**

solving a real-world problem.

**Item alignment: Part I covers Objectives 1, 3, 4, 6, and 7. Part II covers Objectives 4, 5, 6, and 7. Part III covers Objectives 2, 3, 4, and 6.**

###### Answer Key, Part I (Multiple Choice):

1. C. Awarding gold, silver, and bronze is ordered, so it is a permutation.
2. A. P(n, k) = n! / (n - k)!.
3. B. P(6, 2) = 6 × 5 = 30.
4. C. P(5, 5) = 5! = 120.
5. A. Arranging 4 distinct books in a row gives 4! = 24.

###### Answer Key, Part II (Constructed Response):

1. (a) P(8, 3) = 8! / 5! = 8 × 7 × 6 = 336. (b) CA, CT, AC, AT, TC, TA give 6 arrangements, and P(3, 2) = 3! / 1! = 6, so the two agree.
2. (a) P(10, 3) = 10 × 9 × 8 = 720. (b) The three posts are distinct, so the order of assignment matters, which makes it a permutation.

-----

###### Answer Key, Part III (True or False with Reasoning):

1. True. By definition a permutation is an ordered arrangement of distinct objects.
2. False. That is the combination formula. The permutation formula is P(n, k) = n! / (n - k)!.
3. True. P(n, n) = n! / 0! = n!, since 0! = 1.
4. False. P(5, 2) = 20, while P(2, 5) is undefined because you cannot arrange 5 objects chosen from only 2.
5. True. P(n, 1) = n! / (n - 1)! = n.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

***C.4. Additional Activities (Complete instructions for learners please are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

**Purpose: Remediation rebuilds the slot-by-slot reasoning behind P(n, k) for learners who struggled in C.3. Enhancement extends the**

formula to the 0! result and to comparing sizes without full computation.

###### For Remediation Strategy: Concrete-to-Symbolic Scaffold

Learners arrange drawn objects, then connect the count to the cancellation in the formula. Figure 6 shows the chairs step.

###### Procedure for the teacher:

1. Have learners draw small circles for the balls and boxes for the chairs, so the slots are visible.
2. Stress that RG and GR are different arrangements because they read differently.
3. For the chairs, note that once a student sits in Chair 1 they are unavailable for Chair 2, so the choices drop from 5 to 4.

![](img_p26_1.png)

*Figure 6. Filling 2 chairs from 5 students: 5 × 4 = 20 = P(5, 2).*

-----

|  | Answer to the task: • Step 1: RB, BR (total 2). • Step 2: RG, RB, GR, GB, BR, BG (total 6). • Step 3: 5 choices, then 4; 5 × 4 = 20. • Step 4: P(5, 2) = (5 × 4 × 3 × 2 × 1) / (3 × 2 × 1) = 5 × 4 = 20. For Procedure for the teacher: allow independent work with hints. For computation and focus on the length of the product. Answer to the task: • Challenge 1: P(5, 5) = 5! / (5 - 5)! = 5! / 0! = 5! / 1 = 120 = 5!. So does nothing. • Challenge 2: P(10, 6) is larger. P(10, 4) = 10 × 9 × 8 × 7 has 4 factors, factors 6 and 5 are greater than 1, so more slots means a larger | Enhancement Challenge 1, lead learners to 0! = 1. For Challenge 2, forbid full when all objects are arranged, (n - k)! = 0! = 1, and the denominator while P(10, 6) = 10 × 9 × 8 × 7 × 6 × 5 has 6 factors. The extra count. |
|---|---|---|
| III. CONTENT | Lesson 1.3. Combinations | of Distinct Objects |
| IV. OBJECTIVES | By the end of the lesson, the learners are expected to: 1. investigate selections from small sets through enumeration to 2. distinguish combinations from permutations using contextual 3. define a combination as an unordered selection of distinct 4. derive the relationship C(n, k) = P(n, k) / k! by examining how 5. calculate C(n, k) using the formula and factorial notation; 6. investigate properties of combinations through small cases: C(n - 1, k - 1) + C(n - 1, k); 7. apply the properties of combinations to compute and verify 8. solve basic problems involving combinations in real-world | recognize counting problems where order does not matter; cues in problem statements; objects; each combination corresponds to k! orderings; C(n, k) = C(n, n - k), C(n, 0) = 1, C(n, n) = 1, and Pascal's rule C(n, k) = counts of subsets; and contexts. |
| V. PROCEDURES | ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Password Puzzle Instructions: Work on your own first, then compare your answers with a partner. Be systematic so that you can neither miss nor repeat any passwords. You have three letters: A, B, and C. List all possible 2-letter passwords you can make without repeating a letter. 1. Write down every possible password. 2. State how many passwords you found. | Activity A.1. Leveling Learners Readiness Purpose: Recall ordered counting from Lesson 1.2. The activity confirms that learners treat a reordering as a new outcome, so the next phase can contrast it with a selection where order does not matter. Strategy: Individual-then-Pair Listing Learners list on their own, then pair up to combine and check, so the teacher sees who can enumerate completely. |

-----

| Processing Questions: 1. How many passwords were you able to list? 2. Is the password AB the same as the password BA? Why or why not? | Procedure for the teacher: 1. Present the three letters and the no-repetition rule. 2. Circulate and watch for repeated letters such as AA, and for random instead of systematic listing. 3. Organize the list on the board by first letter: A first (AB, AC), then B (BA, BC), then C (CA, CB). Answer to the task: The 6 passwords are AB, AC, BA, BC, CA, CB. This is P(3, 2) = 6. AB and BA are different because the order of the letters matters in a password. Facilitating Reflection: • PQ1. Intent: confirm the ordered count. Answer: 6, since each of the 3 first letters pairs with 2 second letters. • PQ2. Intent: surface that order matters. Answer: no; AB and BA use the same letters in a different order, so they are different passwords. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance Fruit Shake Mix Instructions: Read the scenario and list the shakes. Then answer the questions. You own a smoothie shop with three fruits: Apple (A), Banana (B), and Mango (M). A customer wants a shake made of exactly 2 different fruits. List all the possible 2-fruit shakes you can blend. Processing Questions: 1. How many different shakes can you make? 2. Is an Apple-Banana shake different from a Banana-Apple shake? 3. How does this compare to the Password Puzzle? | Activity A.2. Appreciating Lesson Relevance Purpose: Motivate the lesson with a selection where order does not matter. The felt difference between a shake and a password introduces the combination. The phase is motivational, not exploratory. Strategy: Blend-and-Compare Learners list the shakes, then judge whether the order of the fruits changes the result, and compare with the password task. Procedure for the Teacher: 1. Present the three fruits. Watch for same-fruit shakes such as Apple-Apple and remind learners the two fruits must differ. 2. Ask whether putting the banana in first changes the shake. Elicit that order does not matter. 3. Contrast with the password, where order did matter. Answer to the Task: the 3 shakes are Apple-Banana, Apple-Mango, and Banana-Mango, shown in Figure 1. An Apple-Banana shake is the same as a Banana-Apple shake, since the fruits end up mixed, so order does not matter. |

-----

![](img_p29_1.png)

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts From Orders to Groups

**Example 1. Officers versus Committee. From 3 students, Leo, Mia,**

and Noah, we pick 2. As officers, a President and a Vice President, order matters, and there are 6 ordered pairs: (Leo, Mia), (Mia, Leo), (Leo, Noah), (Noah, Leo), (Mia, Noah), (Noah, Mia). As members of a cleaning committee, both members do the same job, so order does not matter, and (Leo, Mia) and (Mia, Leo) are one group. Removing the duplicates leaves 3 groups: {Leo, Mia}, {Leo, Noah}, {Mia, Noah}.

**Example 2. Ranking versus Team. From 5 runners we pick 3. With**

gold, silver, and bronze medals, order matters and there are P(5, 3) = 60 ways. As an unordered team, each group of 3 can be ranked in 3! = 6 ways, so the 60 ranked outcomes collapse into 60 ÷ 6 = 10teams.

**Why divide by k!? P(n, k) counts every order. When order does not**

matter, each group of k objects has been counted k! times, once for

*Figure 1. The 3 two-fruit shakes from Apple, Banana, and Mango,*

where order does not matter.

###### Facilitating Reflection:

- PQ1. Intent: count the selections. Answer: 3 shakes.
- PQ2. Intent: Name that order does not matter. Answer: they are the same shake, since the fruits are mixed together.
- PQ3. Intent: contrast with the password. Answer: the password counted order and gave 6, but the shake does not, so it gives only 3.

###### Activity B.1. Exploring Key Concepts

**Purpose: Derive the relationship C(n, k) = P(n, k) / k! from concrete**

cases. The examples make the overcounting visible before any formula appears, so this is guided discovery.

###### Strategy: Cross-Out the Duplicates

Learners watch ordered outcomes collapse into groups, so the division by k! is seen rather than told.

###### Procedure for the teacher:

1. List the 6 ordered officer pairs on the board.
2. Cross out each reversed duplicate for the committee, leaving 3 groups.
3. For the runners, show that one team of 3 has 3! = 6 rankings, so the 60 ranked outcomes give 60 / 6 = 10 teams.
4. Use Figure 2 to show the six-to-three collapse for a pair.

###### Answer to the task:

Example 1: the 6 ordered pairs become 3 committees, {Leo, Mia}, {Leo, Noah}, and {Mia, Noah}.

-----

| each way to arrange it. Dividing by k! keeps one count per group, so (,) the unordered count is . ! Processing Questions: 1. In Example 1, why did the count drop from 6 to 3 when we switched to a committee? 2. In Example 2, if we picked a team of 4 instead of 3, what number would we divide by to remove the order? 3. How does dividing by k! collapse the list of arrangements into a list of groups? | Example 2: P(5, 3) = 60, and 60 / 3! = 60 / 6 = 10 teams. Figure 2 shows the collapse for a pair. Figure 2. Six ordered pairs collapse to three committees when order does not matter, so P(3, 2) = 6 divided by 2! gives C(3, 2) = 3. Facilitating Reflection: • PQ1. Intent: see the overcounting. Answer: each committee was counted 2! = 2 times, so 6/2 = 3. • PQ2. Intent: generalize the divisor. Answer: divide by 4! = 24. • PQ3. Intent: name what the division does. Answer: dividing by k! removes the k! orderings of the same group, leaving one count per group. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Defining the Combination A combination is a selection of distinct objects where order does not matter. We care only about which objects are chosen, not their arrangement. Formula. Because order does not matter, divide the permutation count by k!, where n is the number of objects and k is the number chosen. Figure 3. The combination formula divides the permutation count by k! because order does not matter. | Activity B.2. Deepening Conceptual Understanding Purpose: Formalize the definition, the formula, and the four properties, and tie them to the overcounting seen in B.1. Strategy 1. Worked Examples with Properties as Shortcuts Work two computations in full, then teach each property with a one- line reason and a small case. Procedure for the teacher: 1. State the definition: a combination is a selection where order does not matter. 2. Work C(10, 4) and C(7, 3), showing the cancellation in the denominator. 3. Teach each property with its reason: one item (Property 1), all or none (Property 2), in versus out (Property 3), and include or exclude one person (Property 4). 4. Show Pascal's rule on the triangle in Figure 4: the cell C(7, 3) is the sum of the two cells just above it. |

![](img_p30_1.png)

![](img_p30_2.png)

-----

![](img_p31_1.png)

**Worked Example 1. Choose 4 students from 10 for a committee.**

Solution:

10! (10, 4) =

(10 - 4)! 4!

10 9 8 7 6!

=

6! 4 3 2 1

5,040

=

24 = 210

*Figure 4. Pascal's triangle: C(7, 3) = 35 is the sum of C(6, 2) = 15* **Worked Example 2. Choose 3 fruits from 7 for a salad. C(7, 3) = 7! /** and C(6, 3) = 20 directly above it. (4! × 3!) = (7 × 6 × 5) / (3 × 2 × 1) = 35.

**Answer to the task: C(10, 4) = 210; C(7, 3) = 35; C(5, 1) = 5; C(15, 0)**

Solution: = C(15, 15) = 1; C(5, 2) = C(5, 3) = 10; and C(7, 3) = C(6, 2) + C(6, 3) =

7! 35. (7, 3) = (7 - 3)! 3!

###### Facilitating Reflection:

7 6 5 4!

= • PQ1. Intent: compare the two counts. 4! 3 2 1

Answer: P(n, k) is larger, or equal when k is 0 or 1, because C

210

= divides P by k!, which is at least 1.

6

- PQ2. Intent: read the denominator. = 35 Answer: (n - k)! removes the orderings of the objects left out, **Properties of Combinations** and k! removes the orderings of the k chosen, since order does **Property 1. C(n, 1) = n.** not matter. Example: C(5, 1) = 5. • PQ3. Intent: see the transition. **Property 2. C(n, 0) = C(n, n) = 1.** Answer: pick a team, then assign roles; for example, choose 5 Example: C(15, 0) = C(15, 15) = 1. players, then name a captain and a point guard.

**Property 3. Symmetry: C(n, k) = C(n, n - k).**

Example: C(5, 2) = C(5, 3) = 10.

**Property 4. Pascal's rule.: C(n, k) = C(n - 1, k - 1) + C(n - 1, k). Example: C(7, 3) = C(6, 2) + C(6, 3) = 15 + 20 = 35.**

-----

| Reason: fix one object. A selection of k either includes it, leaving k - 1 to choose from the remaining n - 1, or excludes it, leaving k to choose from the remaining n - 1. Processing Questions: 1. For the same values of n and k, which is larger, P(n, k) or C(n, k)? Why? 2. In the formula, what does (n - k)! remove, and what does k! remove? 3. Describe a scenario that starts as a combination but becomes a permutation. |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for the learners | please in on the Learning Activity Sheet.) |
| Activity B.3. Practicing Purpose: Build fluency. Learners classify by order, compute with the | Learned Skills formula, then use the properties as shortcuts. |

###### Strategy: Classify First, Then Compute

For each item, ask whether swapping two choices changes the result before any computing.

###### Procedure for the teacher:

1. For Part I, ask whether swapping two items changes the result, and require a reason.
2. For Part II, check the correct n and k and the division by k!.
3. For Part III, push the properties, symmetry and Pascal's rule, over long factorials. Figure 5 shows the symmetry idea.

![](img_p32_1.png)

*Figure 5. Choosing 2 to include from 5 also chooses 3 to leave out, so C(5, 2) = C(5, 3) = 10.*

###### Answer to the task:

**Part I. (1) P, a PIN is ordered; (2) C, a set of flavors where order does not matter; (3) P, the roles are distinct; (4) C, a handshake is an**

unordered pair, C(20, 2) = 190; (5) P, a row is ordered.

**Part II. C(6, 2) = 15; C(8, 3) = 56; C(12, 5) = 792. Part III. C(25, 1) = 25; C(12, 0) = 1 and C(12, 12) = 1; C(10, 8) = C(10, 2) = 45 by symmetry; C(10, 7) = C(9, 6) + C(9, 7) by Pascal's rule.**

-----

| C. | Facilitating Reflection: • PQ1. Intent: explain the division. Answer: dividing by k! removes the k! orderings of the same chosen • PQ2. Intent: see the symmetry. Answer: choosing 2 to include also chooses 8 to leave out, so the • PQ3. Intent: name the test. Answer: ask whether order matters; changing choose 3 players to permutation. C.1. Finding Practical Application | set; the removal is those different arrangements. two counts match. choose 1st, 2nd, and 3rd place flips a combination into a |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Instructions: Read each situation and solve. Show your complete solution. 1. To win the PCSO 6/42 Lotto, you choose 6 numbers from 1 to 42. Since the balls are drawn and mixed, order does not matter. How many combinations are there? 2. A street-food stall has 5 condiments: vinegar, soy sauce, patis, calamansi, and chili oil. You mix exactly 3 in your bowl. How many sawsawan mixes are possible? 3. A barangay has 10 volunteers and needs 4 more to form a health committee for a vaccination drive. How many committees are possible? 4. A Baguio shop sells 8 kinds of jam. Your budget buys a bundle of any 2 distinct jars. How many bundles are possible? Processing Questions: 1. Would the dip change if you poured the vinegar in first instead of the soy sauce? How does this relate to combinations? 2. Why is the Lotto much harder to win than picking a jam bundle? Answer using the values of n and k. 3. If the barangay assigned roles such as Head, Secretary, Treasurer, and Auditor, would we still use C(10, 4)? Why or why not? | Activity C.1. Making Real-World Connections Purpose: Transfer the concept to authentic Filipino contexts and scaffold the performance task. Strategy: Same Logic, Different Context Confirm for each item that order does not matter, then apply the formula. Procedure for the teacher: 1. For the Lotto, note the large values of n and k, and that order does not matter. 2. For the sawsawan and the jams, confirm that a mixture has no order. 3. For the barangay, flag that named roles would change it to a permutation. Answer to the task: (1) C(42, 6) = 5,245,786; (2) C(5, 3) = 10; (3) C(10, 4) = 210; (4) C(8, 2) = 28. Facilitating Reflection: • PQ1. Intent: tie context to order. Answer: no; a dip is a mixture, so order does not matter, which is why it is a combination. • PQ2. Intent: read n and k. Answer: the Lotto has a large n = 42 and k = 6, giving over 5 million, against only 28 for the jams. • PQ3. Intent: spot when order returns. Answer: no; named roles make it a permutation, P(10, 4). |

-----

###### C.2. Making Generalization

###### Activity C.2. Wrapping up the Lesson Stating the Key Points Instructions: Complete each statement in your own words.

1. A combination is a selection where \_\_\_\_\_\_ does not matter.
2. The formula for a combination is C(n, k) = \_\_\_\_\_\_.
3. Choosing k objects to include is the same as choosing \_\_\_\_\_\_ objects to leave out.

###### Processing Questions:

1. In organizing a competition, where would you use combinations, and where would you switch to permutations?
2. Why does picking a small group to win equal picking a large group to lose?
3. Why can C(n, k) never be larger than P(n, k) for the same n and k?

###### C.3. Evaluating Learning

###### Activity C.2. Wrapping up the Lesson

boundary in their own words.

order does not matter; C(n, k) = n! / [(n - k)! × k!]; and choosing k to include is choosing n - k to leave out.

Eliciting prompt: ask learners to finish each statement aloud before it is written. Fallback prompt: if a statement omits order does not matter, ask how a shake differed from a password; if the symmetry statement is missing, return to the in-versus-out picture.

**Purpose: Measure classification, properties, and computation independently. C.3 is an assessment moment, not an instructional task, so it**

carries no Processing Questions.

**Item alignment: Part I cover Objectives 1, 2, 4, 5, and 6. Part II covers Objectives 3, 6, 7, and 8. Part III covers Objectives 2, 3, 4, and 6. Answer Key, Part I (Multiple Choice):**

1. B. A committee is an unordered selection, so it is a combination.

|  | Purpose: Learners state the generalization and its symmetry Target conclusion: a combination selects distinct objects where Strategy: Learner-Voiced Summary Possible incomplete conclusions: stating the formula without the phrase order does not matter; omitting the distinct-objects assumption. Address each by pointing back to A.2 and to Figure 5. Answer to the task: (1) order; (2) n! / [(n - k)! × k!]; (3) n - k. Facilitating Reflection: • PQ1. Intent: separate select from rank. Answer: combinations to select the finalists, permutations to rank the medals. • PQ2. Intent: see the symmetry. Answer: each chosen group fixes the left-out group, so the two counts match. • PQ3. Intent: bound the formula. Answer: C divides P by k!, which is at least 1, so C is never larger. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

-----

2. A. C(n, k) = P(n, k) / k!.
3. C. C(7, 2) = (7 × 6) / 2 = 21.
4. B. C(10, 10) = 1, since there is one way to choose all of them.
5. D. C(8, 3) = (8 × 7 × 6) / 6 = 56. The value 336 is P(8, 3), where order matters.

###### Answer Key, Part II (Constructed Response):

1. (a) C(12, 4) = (12 × 11 × 10 × 9) / (4 × 3 × 2 × 1) = 495. (b) The set of borrowed books is unordered, so the order of selection does not matter.
2. (a) C(100, 1) = 100. (b) C(10, 2) = C(10, 8) = 45 by the symmetry property C(n, k) = C(n, n - k).

###### Answer Key, Part III (True or False with Reasoning):

1. True. By definition, a combination is an unordered selection of distinct objects.
2. True. This is the symmetry property of combinations.
3. False. A committee is unordered, so the count is C(8, 3) = 56, not P(8, 3).
4. True. There is exactly one way to choose nothing, so C(n, 0) = 1.
5. False. C(6, 2) = 15 is less than P(6, 2) = 30, because dividing k! makes the combination count smaller.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict, and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

###### C.4. Additional Activities

###### Activity C.4. Extending and Reinforcing Learning

###### For Remediation

**Purpose: Rebuild the combination formula one step at a time for learners who missed C.3. Strategy: Fill-in Scaffold**

Use the cue Permutation is Position, Combination is Collection. Check n and k, then watch the cancellation. Figure 6 shows the cancellation.

![](img_p35_1.png)

*Figure 6. Cancelling the common 3 × 2 × 1 in C(5, 2) leaves 5 4* = 10.

2 1

-----

###### Answer to the task, Remediation:

(1) does; does not. (2) 2 items from 5, so n = 5 and k = 2. (3) (5, 2) = 5! = 5! = 5 4 3! = 20 = 10

**Purpose: Extend to the symmetry property and to a committee with a constraint. Procedure for the teacher: For Challenge 1, lead to the symmetry property. For Challenge 2, fix the women first, then count the men, and**

multiply rather than add. **Answer to the task, Enhancement: Challenge 1. (20, 3) =** 20! and (20, 3) = 20! ; the denominators are the same product, so C(20,

3) = C(20, 17) = 1,140. This is the symmetry property C(n, k) = C(n, n - k). Challenge 2: with no restriction, C(8, 4) = 70; with exactly 3 women, choose 3 of the 3 women, C(3, 3) = 1, and 1 of the 5 men, C(5, 1) = 5, so 1 × 5 = 5 ways.

[(5-2)! 2!] 3! 2! 3! 2 1 2

###### For Enhancement

(17! 3!) (3! 17!)

|  |  |  |
|---|---|---|
| III. CONTENT | Lesson 1.4. Permutations with | Repetition and Circular Arrangements |
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. examine arrangements of words with repeated letters (e.g., 2. derive the formula for permutations of non-distinct objects: n! element; 3. calculate the number of permutations of a set with non-distinct 4. investigate seating arrangements around a circular table for arrangements; 5. derive the formula for circular permutations of n distinct objects: 6. calculate the number of circular permutations of distinct objects; 7. differentiate between linear and circular arrangements in problem | MISSISSIPPI) to recognize overcounting in standard permutation counts; / (n1! · n2! · … · nk!), where the ni count occurrences of each repeated elements; small groups to recognize that rotations produce equivalent (n - 1)!; and contexts and apply the appropriate formula. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Three Letters in a Row Materials: three letter cards marked C, A, and T per pair; one sheet for listing. |  |

###### Instructions:

1. Work with a partner. Place the three cards C, A, and T side by side in a straight line.
2. List every different order you can make by moving the cards. Write each order as a three-letter word.

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness

**Purpose: Recall how to count arrangements of distinct objects in a**

line before the lesson introduces two new cases: arrangements with repeated objects and arrangements around a circle. The prerequisite skills are the factorial, the count of linear permutations of distinct objects (n!), and the multiplication principle from Lessons 1.1 and 1.2.

###### Procedure for the teacher:

1. Distribute three letter cards (C, A, T) to each pair and ask them to list all orders by hand.

-----

| 3. Count how many different orders you found. Compare your list with another pair. Processing Questions: 1. How many different orders of C, A, and T did you find, and how did you make sure none were repeated? 2. If you add one more distinct card, say S, how many orders would there be, and what pattern do you notice in the counts? 3. What would happen to your count if two of the three cards showed the same letter instead of three different letters? | 2. Have two pairs compare lists and reconcile any duplicates, so the class agrees on six orders. 3. Ask students to state the count as a product, 3 × 2 × 1, and name it as 3 factorial. 4. If many pairs miss orders or list duplicates, re-teach the systematic listing of n! arrangements with a four-letter example before moving to B.1. If only a few struggle, refer them to the guided items in B.3 and proceed with scaffolding. Answer to the task: The six orders are CAT, CTA, ACT, ATC, TCA, and TAC, so the count is 3! = 3 × 2 × 1 = 6. Facilitating Reflection: PQ1. Intent: confirm the systematic counting of distinct arrangements. Answer: six orders; students avoid repeats by fixing the first letter, then listing the orders of the remaining two. PQ2. Intent: surface the factorial pattern that feeds the new formulas. Answer: four distinct cards give 4! = 24 orders; each extra distinct object multiplies the count by the next whole number. PQ3. Intent: open the gap that the lesson will close. Answer: with two identical cards some listed orders look the same, so the plain count of 6 is too high; this is the overcounting the lesson will correct. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance Planning the Barangay Fiesta Program Your barangay is preparing for its annual fiesta. You are on the program committee, and two small jobs are assigned to you. Read the situation, then answer the orienting questions. You are not expected to finish counting yet. The situation: 1. For the welcome banner, you will print the letters of the word FIESTA across the stage. The committee also considers the word LETTERS for a second banner. You must report how many different letter arrangements each banner word allows. 2. For the program proper, eight guests of honor will be seated around one round table near the plaza. You must report how | Activity A.2. Appreciating Lesson Relevance Purpose: Set the purpose of the lesson with one familiar scenario that learners can start but cannot finish with current methods. The fiesta program raises two questions the lesson will answer: counting arrangements when letters repeat and counting seating around a circle. The terms of permutations with repetition and circular permutations are named here only as ideas to be defined later in B.2. Procedure for the teacher: 1. Read the fiesta scenario aloud and connect it to a fiesta the class knows. 2. Let learners attempt a count for FIESTA, which has all distinct letters, so 6! = 720 works with current knowledge. 3. Ask them to try LETTERS and the round-table seating. Do not correct it yet. Record their guesses on the board to revisit in C.2. |

-----

| B. Instituting | many different seating plans are possible if turning the whole table does not count as a new plan. Processing Questions: 1. Which of the two banner words feels harder to count, and why might its arrangements be fewer than the letters suggest? 2. When the guests sit around the round table, why might turning the table give a seating that is not really new? B.1. Presenting Examples | 4. Collect two or three responses to each Processing Question and name the gap: the class has a method for distinct items in a line, but not yet for repeated items or for a circle. 1. Expected response to the task: Learners count FIESTA as 6! = 720 because every letter is distinct. They stall on LETTERS, which repeats E and T, and on the round table, where turning the table reuses seatings. The stall is intended and motivates B.1 and B.2. Facilitating Reflection: PQ1. Intent: surface that repeated letters reduce the number of distinct arrangements. Answer: LETTERS is harder; the repeated E and T make some arrangements look identical, so the true count is below 7!. PQ2. Intent: surface rotational equivalence. Answer: turning the table moves everyone at once, so each guest keeps the same neighbors; the plan is the same, not new. |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Cards on the Table Materials: four index cards per group; markers. On the front, color one card Blue, one Green, and two Red. On the back, write the numbers 1, 2, 3, and 4. Part I. The Woven Bag Display Instructions: 1. Show the colored side. The four cards are woven bags for a stall display: Blue, Green, Red, Red. 2. Place the four cards in a straight line. Swap the two red cards with each other and look at the line. Decide whether a customer would see any difference. 3. List every color arrangement that looks different to a customer. Count them and write the total. 4. Now flip the cards to the numbered side. The four cards are now all different. List how many arrangements are possible and write that total beside the first one. | Activity B.1. Exploring Key Concepts Purpose: Let learners discern, through a small example space, the two features this lesson formalizes: identical objects remove arrangements, and rotation around a circle removes arrangements. The hands-on counts prepare the formulas derived in B.2. Example space and variation plan: • Part I holds the total at four cards and varies only one feature: distinct (numbered, 1 2 3 4) against two identical (colored: Blue Green Red Red). Holding n fixed makes the repeated feature the divisorthat stands out. • Part II holds the four objects fixed and varies only the structure: a line against a circle. This isolates rotation as the feature that lowers the circular count. Strategy for directing attention: Ask groups to compare the two counts within each part and to point to the one feature that changed. The example space is built so that one feature varies while the rest stay fixed, which is the condition that lets the intended feature be discerned (Marton, 2015; Watson & Mason, 2006). Keep the discovery assisted rather than open, supplying the neighbor check and the non- |

-----

| Part II. The Round Table Instructions: 1. Keep the numbered side up. Place the four cards evenly around the rim of a paper plate as four guests at a round table. 2. Note who sits to the left and right of guest 1. Turn the whole plate one quarter-turn. Check the neighbors of guest 1 again. 3. Decide whether the turn produced a new seating. Then count only the seatings whose neighbor pattern is truly different and write the total. Processing Questions: 1. On the colored side you found fewer arrangements than on the numbered side, even though there are four cards in both. What feature of the colored set caused the smaller count? 2. When you turned the plate, what stayed the same for guest 1, and what does this tell you about counting seatings around a circle? 3. Across both parts, what single question would you ask first to decide whether a count will be smaller than the plain number of orders? | example as structure (Mayer, 2004; Alfieri et al., 2011). Resist naming the formulas; let the counts and the neighbor check carry the discernment. Answer to the task: • Part I. Numbered (all distinct): 4! = 24 arrangements. Colored (two red cards): 12 distinct displays, because each display is reached by the two identical red cards in 2! = 2 ways. The 12 displays are the 24 orders grouped into pairs that look the same. • Part II. Four guests in a line: 4! = 24 orders. Around the plate: 6 truly different seatings, because the four rotations of any seating share the same neighbor pattern and count once. The collapse from 24 to 6 is a division by 4, the number of seats. Facilitating Reflection: PQ1. Intent: Discern that identical objects cause overcounting. Answer: the two identical red cards make some orders look the same, so the count drops from 24 to 12. PQ2. Intent: discern rotational equivalence. Answer: guest 1 keeps the same left and right neighbors after the turn, so a rotation is not a new seating; circular counts are smaller for this reason. PQ3. Intent: Name the first decision a learner should make. Answer: ask whether any objects are identical or whether the arrangement is around a circle; either feature makes the count smaller than the plain number of orders. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Part 1. Permutations with Repeated Elements A permutation with repeated elements, also called a permutation of non-distinct objects, is an arrangement of n objects in a line when some of the objects are identical. The plain count n! treats every object as different. When some objects are identical, swapping them does not produce a new arrangement, so n! counts each distinct arrangement more than once. Figure 1 shows this overcounting for a row that contains two identical red items. | Activity B.2. Deepening Conceptual Understanding Big ideas: Plain factorial counting assumes every object is distinct, and every position is fixed. Repeated objects break the first assumption, and a circle breaks the second. Each case is repaired by dividing the plain count, by the repeat factorials for identical objects and by n for a circle. Strategy for the discussion (what to highlight): • Definitional strand. Fix the terms permutation with repetition and circular permutation, and the notation n! / (n1! · n2! · … · |

-----

![](img_p40_1.png)

**Figure 1. Why identical objects cause overcounting in a line**

**Derivation.**

1. Arrange all n objects as if they were distinct. This gives n! orders.
2. Each group of identical objects can be rearranged by itself without changing the arrangement. A group of ni identical objects can be rearranged in ni! ways, all of which look the same.
3. Divide n! by the factorial of every repeat group to remove the duplicates. With repeat groups of sizes n1, n2, up to nk, the count of distinct arrangements is ! ! · ! · … · !

1 2

**Worked Example 1. How many distinct arrangements of the letters**

of MISSISSIPPI are there? The word has 11 letters with M once, I four times, S four times, and P twice.

11! 39 916 800

= = 34 650

1! · 4! · 4! · 2! 1 152

**Worked Example 2. How many distinct arrangements of the letters**

of BALLOON are there? The word has 7 letters with L twice and O twice.

7! 5 040

= = 1 260

2! · 2! 4

**Worked Example 3. A stall arranges 8 woven keychains in a row: 3**

red, 3 blue, and 2 green, with same-color keychains identical. How many distinct rows are possible?

8! 40 320

= = 560

3! · 3! · 2! 72 nk!) and (n - 1)!. Tie each term back to the cards and the plate from B.1.

- Relational strand. Connect both formulas to the linear permutation n! from Lessons 1.1 and 1.2: each new formula is n! with a correction. Foreground that B.1 supplied the counts (24 to 12 and 24 to 6) that the formulas now explain, and that B.3 will rehearse them.
- Procedural strand. Give a steady order of steps: count the objects, identify repeats or a circle, write the correction, then compute. Model this on Worked Examples 1 to 3 of each part.

**Answer to any task posed: The three worked examples in each part**

are teacher models, not learner tasks, so their results are shown in the Activity column. No separate answer key is needed here.

###### Facilitating Reflection:

**PQ1. Intent: Justify division.**

Answer: the identical objects rearrange into equal-size groups of look-alike orders, and dividing by the group size counts each group once; subtraction would not match the group structure.

**PQ2. Intent: justify the circular reduction.**

Answer: each seating appears once for each of the n starting positions, so dividing n! by n removes the rotations and leaves (n - 1)!.

**PQ3. Intent: decide when to halve.**

Answer: halve only when the whole circle can be turned over, so the back equals the front, as with a loose bracelet, where the 120 orders pair into 60. A fixed display board shows only its front, so a design and its mirror image are different and the count stays (n - 1)! = 120; People at a table likewise cannot be turned over.

*Teacher's Technical Note: Two conditions must both hold before* halving. First, the circle must be genuinely two-sided, that is, a loose object that can be turned over; a fixed display, a board, or a table is one-sided and is never halved. Second, the beads must be all distinct, so every design has a distinct mirror image with which to pair. When beads are repeated, however, some designs are their own mirror image and halving overcorrect. Worked check: 2 red and 2 blue beads

-----

###### Part 2. Circular Permutations

A circular permutation is an arrangement of n distinct objects around a circle, where rotations of the same arrangement are counted as one. In a circle there is no fixed first position, so turning the whole arrangement keeps every neighbor and does not create a new arrangement. Figure 2 shows the four rotations of a four-seat table collapsing into one seating.

on a loose bracelet give exactly two circular designs, the two reds together (red, red, blue, blue) and the alternating design (red, blue, red, blue). Turn either one over and it reads the same, so each is its own mirror image; the flip merges nothing, and the answer is 2 designs, not 2 / 2 = 1. The exact count for repeated beads needs a more advanced method, Burnside's lemma, which is beyond this lesson. Every loose-object example in this lesson uses distinct beads or keys, so (n - 1)! / 2 is exact, while the repeated-bead cases here

![](img_p41_1.png)

and in Summative Assessment item 12 stay on fixed one-sided displays where no halving is attempted.

**Figure 2. Rotations of a circular arrangement count as one**

**Derivation.**

1. Arrange the n distinct objects as if in a line. This gives n! orders.
2. Around a circle, each arrangement can start at any of the n positions, so every circular arrangement appears n times among the n! line orders.
3. Divide by n to count each circular arrangement once: ! = ( - 1)! An equivalent view fixes one object in place to stop the rotation, then arranges the remaining n - 1 objects freely, which also gives (n - 1)! arrangements.

**Worked Example 1. In how many ways can 8 people sit around a**

round table?

(8 - 1)! = 7! = 5 040

**Worked Example 2. Seven distinct flowers are placed around a**

circular wreath. How many distinct arrangements are possible?

(7 - 1)! = 6! = 720

###### Part 3. When to Halve a Circular Count, and When Not To

A circular count is halved only when the whole circle can be turned over so that its mirror image is the same object. A loose necklace, bracelet, or keychain can be turned over. Reading it from the back reverses the order around the circle, which swaps each bead's left and

-----

right neighbors, yet it is the same physical object. Figure 3 shows one such necklace from the front and from the back: bead 1 keeps beads 2 and 5 as its neighbors, but those two beads switch sides.

![](img_p42_1.png)

**Figure 3. A necklace you can turn over: the front and the back are**

When the flip is allowed, every circular arrangement pairs with exactly one mirror twin, so the (n - 1)! arrangements split into matching pairs

and we count each pair once by dividing by 2:

**Worked Example 1. Six different beads are strung on a loose bracelet**

that can be turned over. How many distinct bracelets are possible?

**When you do not halve. Many circles cannot be turned over, so the**

flip is not allowed and the count stays (n - 1)!. Keep the full count

when:

- the objects are people around a table, since you cannot turn a person over;
- the objects are mounted on a fixed board, display, or wall, since

you only ever see the front;

- the problem states that clockwise and counterclockwise, or the

front and the back, are different.

*the same object*

( - 1)! 2

(6 - 1)! 120

= = 60

2 2

**Worked Example 2. The same six different beads are now glued onto**

a fixed display board that hangs on a wall, so only the front is ever

seen. How many distinct designs are possible?

(6 - 1)! = 5! = 120

-----

| Same six beads, yet 60 for the loose bracelet and 120 for the fixed display. The word bracelet, beads, or jewelry does not decide the count. The deciding question is whether the whole circle can be turned over so that its back equals its front. If yes, halve. If it sits on a fixed base or shows only one side, do not halve. Worked Example 3. Five different keys are placed on a loose circular key ring that can be turned over. How many distinct arrangements are possible? (5 - 1)! 24 = = 12 2 2 Processing Questions: 1. Why do we divide by the factorial of each repeat group rather than subtract the repeats? 2. Why does the circular count fall from n! to (n - 1)!, and what does the number we divide by represent? 3. A loose bracelet and a fixed display board can hold the same beads in a circle. Why does one halve the count while the other does not? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Purpose: Build fluency in choosing and applying the three rules. The Variation principle behind the sequence: Guided items 1 and 2 Independent items 3 and 4 repeat those structures for transfer. Item structure changes while the arithmetic stays small. Minimum success and one plain circular item with the correct formula. Strategies for guided and independent practice: In guided practice, independent practice, require the one-sentence reason, so technique the arrangement is a line or a circle. Answer to the task: • Part I, item 1. MUSICALLY has 9 letters with L twice: 9! / 2! = 362 • Part I, item 2. Nine guests around a circle: (9 - 1)! = 8! = 40 320. • Part II, item 1. CONCERT has 7 letters with C twice: 7! / 2! = 5 040 • Part II, item 2. Seven performers in a circle: (7 - 1)! = 6! = 720. • Part II, item 3. BANANA has 6 letters with A three times and N twice: • Part II, item 4. Six charms on a bracelet, flip counts as the same: Facilitating Reflection: PQ1. Intent: group items by structure. Answer: items 1, 3, and 5 are repeated-element words; items 2 and by asking whether items repeat and whether the shape is a circle. | Learned Skills set is sequenced by structural variation, not by harder numbers. present one clean case each, a single repeated letter and a plain circle. 5 adds a second repeat group, and item 6 adds the flip rule, so the criterion before C.1: each learner solves at least one single-repeat word model the first task aloud, then have groups narrate the second. In selection is visible. Circulate and ask which letters repeat and whether 880 / 2 = 181 440. / 2 = 2 520. 6! / (3! · 2!) = 720 / 12 = 60. (6 - 1)! / 2 = 120 / 2 = 60. 4 are plain circular permutations; item 6 is the flip case. Learners tell |

-----

| C. | PQ2. Intent: locate the common error. Answer: item 5 (BANANA) or item 6 (bracelet) usually trips groups; catches it. C.1. Finding Practical Application | the step that checks for a second repeat group or for the flip rule |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Sportsfest and Cultural Night Plan Your class helps plan the school Sportsfest and Cultural Night. Work in groups of four to five. You will use the arrangement rules from this lesson to settle two real planning questions, then present your plan with a short slide or poster. Materials: one worksheet per group; optional slide or design tool such as Canva or a presentation app. Task: 1. Stage banner. The opening banner will spell the word SPORTS in large cut-out letters. Find out how many distinct letter arrangements the banner allows and justify which rule you used. 2. Judges' table. Ten guest judges will sit around one round table on stage. Find how many distinct seating plans are possible if turning the table is not a new plan and justify the rule you used. 3. Plan note. In two or three sentences, state one planning decision your two numbers support, such as how many banner drafts to prepare or whether a fixed seat is needed for the head judge. Processing Questions: 1. Which assumption did you make about the SPORTS letters, and how would the count change if the two S letters were printed in different colors? 2. For the judges' table, what would change in your count if the head judge took a fixed seat first? 3. Where did mathematics fit the planning, and where did a real program detail not fit the formula? | Activity C.1. Making Real-World Connections Purpose: Transfer the two arrangement rules to an authentic school- event context and surface the assumptions a model carries. Contextualization is a curriculum mandate (Department of Education, 2023; Republic Act No. 10533, 2013), so the task is built from a familiar Philippine school event. Strategy for facilitating the modeling cycle: Have groups with state assumptions first, then compute, then check the answer against the planning question. Discuss where two identical letters or a rotation match the real objects, and where the formula stops short, for example when a head judge needs a fixed seat. Answer to the task: • Banner. SPORTS has 6 letters with S twice: 6! / 2! = 720 / 2 = 360 distinct arrangements. • Judges' table. Ten judges around a round table: (10 - 1)! = 9! = 362 880 distinct seating plans. • Plan note answers vary. A sound note uses the two counts, for example noting that 360 banner options give wide design freedom, while a fixed head-judge seat would change the seating count. Facilitating Reflection: PQ1. Intent: examine the identical object assumption. Answer: the two S letters are treated as identical, so the count is 360; printing them in different colors makes all six letters distinct, giving 6! = 720. PQ2. Intent: Connect to fixing a position. Answer: seating the head judge first fixes one position, which is the same as the circular reduction, leaving 9! arrangements for the rest, the same 362 880. PQ3. Intent: judge the fit of the model. Answer: the formulas fit the counting of arrangements, but real details such as guest preferences or stage size are not captured and must be handled separately. |

-----

| C.2. Making Generalization |  |
|---|---|
| Activity C.2. Wrapping up the Lesson One Rule for Each Shape In your own words, pull the lesson together. Use Figure 4 as a memory aid, then write your own conclusion. Figure 4. Choosing the arrangement formula by shape and repetition Instructions: 1. On a strip of paper, write one sentence that tells a classmate how to decide which formula to use for an arrangement problem. 2. Below it, write one sentence stating when each rule does not apply, for example when items can be repeated freely or when a line has no repeats. 3. Share both sentences with a partner and agree on a single class generalization. Processing Questions: 1. In one sentence, how do you decide among n!, the repeated- element rule, and the circular rule? 2. Why does each rule work, in terms of overcounting? 3. When does the circular rule (n - 1)! not apply, and when must you also divide by 2? | Activity C.2. Wrapping up the Lesson Purpose: Have learners state and bound the lesson generalization in their own words, without new examples. Target conclusion in final form: A spoken or written rule of this form: count the plain orders with n!, then correct for the situation; divide by the factorial of each repeated group when objects are identical, and divide by n, giving (n - 1)!, when the arrangement is around a circle, with a further division by 2 when the circle can be flipped. Strategy for facilitating: Eliciting prompt: ask, in one sentence, how to choose the formula for any arrangement problem. Fallback prompt, when a statement is partial: ask what feature of the objects or the shape forces a smaller count than n!. Possible incomplete or incorrect conclusions and how to address them: • Stating only the circular rule and omitting repeats. Address by pointing to Figure 4, row two. • Claiming repeats always halve the count. Address by recalling BANANA from B.3, where the divisor is 3! times 2!. • Applying the flip rule to seated people. Address by asking whether the object can be turned over. Answer to the task: Acceptable generalizations match the target conclusion above and name at least the repeated-element rule and the circular rule with their reasons. Facilitating Reflection: PQ1. Intent: articulate the decision. Answer: use n! when items are distinct and in a line, divide by repeat factorials when items are identical, and use (n - 1)! when the arrangement is around a circle. PQ2. Intent: Justify the rules. Answer: each correction removes counts that look the same, identical-object swaps for repeats and rotations for circles. PQ3. Intent: mark the boundary. Answer: (n - 1)! does not apply to a line or when repetition is allowed freely; divide by 2 only when the whole circle can be turned over so its back equals its front, as with a loose bracelet, while a fixed display or a table keeps (n - 1)!. |

![](img_p45_1.png)

-----

***C.3. Evaluating Learning (Complete instructions for learners is on the Learning Activity Sheet.)***

###### Activity C.3. Assessing Learning Outcomes

**Purpose: Measure the objectives independently: recognizing overcounting, computing permutations with repetition, computing circular**

permutations, and distinguishing linear from circular.

**Item alignment: Part I cover Objectives 1, 2, 3, 5, 6, and 7. Part II covers Objectives 2, 3, 5, and 6. Part III covers Objectives 1, 2, 3, 5, and**

7.

###### Answer Key, Part I (Multiple Choice):

1. B. The plain count overcounts because some letters are repeated.
2. C. LEVEL has L twice and E twice, so 5! / (2! × 2!) = 120 / 4 = 30.
3. B. A round table of 5 distinct people gives (5 - 1)! = 4! = 24.
4. C. Seating guests around a round table requires circular permutation.
5. A. BANANA has A three times and N twice, so 6! / (3! × 2!) = 720 / 12 = 60.

###### Answer Key, Part II (Constructed Response):

1. ADDRESS has 7 letters with D twice and S twice, so 7! / (2! × 2!) = 5,040 / 4 = 1,260. We divide because each repeated pair can swap without changing the word.
2. (a) (6 - 1)! = 5! = 120. (b) Rotations of the same seating are counted once, so we fix one person and arrange the remaining five.

###### Answer Key, Part III (True or False with Reasoning):

1. True. Dividing n! by the factorials of the repetition counts remove the overcount from identical letters.
2. False. LEVEL repeats L and E, so the count is 5! / (2! × 2!) = 30, not 120.
3. True. Fixing one of the n distinct objects leaves (n - 1)! arrangements of the rest.
4. False. A circular arrangement divides rotations, so (n - 1)! is less than the linear count n!.
5. True. BOOK has O twice, so 4! / 2! = 24 / 2 = 12.

###### Scoring approach and total points:

Part I. 2 points per item, correct option, 10 points. Part II. 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

-----

***C.4. Additional Activities (Complete instructions for learners on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning For Remediation

###### Small Steps with Small Numbers

**Purpose: Rebuild the two core skills with small numbers and a fixed three-step routine for learners who missed items in C.3.**

**Strategies for facilitating: Use letter cards and a paper plate as in B.1. Walk through MAMA once, then have pairs narrate each step. Give**

immediate corrective feedback when a divisor is missed.

###### Answer to each task:

- BALL: 4! / 2! = 24 / 2 = 12.
- PEPPER: 6 letters with P three times and E twice: 6! / (3! times 2!) = 720 / 12 = 60.
- KAYAK: 5 letters with K twice and A twice: 5! / (2! times 2!) = 120 / 4 = 30.
- Rule fill-in: 4 books on a shelf use 4! (a line of distinct items); 4 people around a table use (4 - 1)! (a circle).
- Six people around a round table: (6 - 1)! = 5! = 120.

###### Facilitating Reflection:

**PQ1. Intent: locate the divisor.**

Answer: divide by the factorial of each repeated letter count, found by tallying the letters.

**PQ2. Intent: confirm the circular reduction.**

Answer: rotations of the round table repeat seating, so the count is smaller than the line count.

###### For Enhancement Event Planner Challenge

**Purpose: Stretch confident learners to a multi-repeat word and a circular arrangement with a togetherness condition. Strategies for facilitating: Let learners work independently, then compare strategies. Ask them to justify the block method for the duo. Answer to each task:**

- SUCCESSFUL has 10 letters with S three times, U twice, and C twice: 10! / (3! times 2! times 2!) = 3 628 800 / 24 = 151 200.
- Twelve performers in a circle with a duo together: treat the duo as one block, so 11 units around the circle give (11 - 1)! = 10! = 3 628 800; the duo can stand in 2! = 2 internal orders, so the total is 10! times 2! = 7 257 600.

###### Facilitating Reflection:

**PQ1. Intent: Justify the block.**

Answer: the block reduces 12 objects to 11 around the circle, giving (11 - 1)!, and the duo's own order adds the factor 2!.

**PQ2. Intent: extend the model.**

Answer: adding a third performer to the block changes the block size and its internal order, lowering the unit count while raising the internal factor.

-----

| III. CONTENT | Lesson 1.5. Combinatorial Counting | Techniques and Their Applications |
|---|---|---|
| IV. OBJECTIVES | At the end of the lesson, the learners are will 1. examine distribution scenarios involving distinct objects placed combinations; 2. compute the number of ways of distributing distinct objects into restrictions); 3. examine distribution scenarios involving non-distinct (identical) technique through small cases; 4. compute the number of ways of distributing non-distinct objects 5. analyze counting problems to determine which combinatorial combination, or distribution); and 6. solve multi-step counting problems that combine principles, scenarios. | into distinct groups; relate to the multiplication principle and distinct groups under varied conditions (with or without objects placed into distinct groups; introduce the stars-and-bars into distinct groups using stars and bars; technique applies (addition, multiplication, permutation, permutations, combinations, and distributions in real-world |
| V. PROCEDURES | LEARNERS ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1 Leveling Learners Readiness Name That Technique Before learning to distribute objects into groups, recall the counting tools you already have. Work in pairs. For each scenario below, do not compute the answer yet. Instead, name the technique that fits and give a one-line reason. | Activity A.1. Leveling Learner Readiness Purpose: Activate the prior tools from Lessons 1.1 to 1.4 and start |

**The five techniques to choose from are: the addition principle,** 1. Review the addition rule (choose among separate options) and

multiplication principle, permutation (linear or circular), combination, the multiplication rule (do one step, then another) with one and distribution (identical objects into groups). quick example each.

###### Scenarios:

1. Five students line up for a class picture. How many arrangement are possible?
2. From 10 students, a teacher selects 3 to form a committee.
3. Seven identical candies are given to 3 children, and any child may receive any number of candies.
4. A student has 4 shirts and 3 pairs of pants and picks one of each.
5. On the same afternoon there are 2 separate concerts, and a student may attend exactly one of them or none.
6. Six friends are seated around one circular table.

distinct or identical? Is this choosing, arranging, or sharing out?

4. Collect answers on the board and reconcile disagreements. Flag scenario 3 as the new case the lesson will develop.

###### Answer to the task:

the habit the whole lesson rests on: read the structure of a problem before computing. This sets Objective 5, choosing the correct

technique, and surfaces the gap that distribution fills.

###### Procedure for the teacher:

2. Give each pair six scenarios. Ask only for the technique and a reason, not the number, so attention stays on structure.
3. Circulate and probe: Does order matter here? Are the objects
1. Permutation. Order matters in a line. (5! = 120.)
2. Combination. A committee is a subset; order does not matter. (C(10, 3) = 120.)

-----

| Processing Questions: 1. What clue in a problem tells you that order matters, so the tool is a permutation rather than a combination? 2. What changes in a counting problem when the objects become identical instead of distinct? 3. Why is it worth naming the technique before reaching for a formula? | 3. Distribution of identical objects. Only the count each child gets matters. This is the new case, solved later by stars and bars. (C(9, 2) = 36.) 4. Multiplication principle. One shirt and one pair of pants, chosen in steps. (4 × 3 = 12.) 5. Addition principle. The options are separate and a student takes at most one. (2 concerts or none gives 3 choices.) 6. Circular permutation. A round table has no fixed first seat. ((6 - 1)! = 120.) Facilitating Reflection: PQ1. Intent: surface the order test. Answer: if rearranging the same chosen objects gives a different valid outcome, order matters and the tool is a permutation; if not, it is a combination. PQ2. Intent: preview the lesson's core idea. Answer: with identical objects you can no longer tell arrangements apart, so only the counts per group matter, and ordinary permutations overcount. PQ3. Intent: establish the analyze-first habit. Answer: naming the technique forces you to read the structure, which prevents using the wrong formula on a problem that looks similar but is not. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance Two Ways to Share Things Out Your school's relief committee faces two sharing tasks. Read both, then attempt a count. You are not expected to finish; the point is to identify where your current methods fall short. Situation 1 (different items). There are 5 different starter kits (Notebook, Ballpen, Ruler, Calculator, Envelope) to hand out to 3 student leaders. Any leader may receive any number of kits, including none. In how many ways can the kits be handed out? Situation 2 (identical items). There are 10 identical food packs to share among 4 evacuation groups. A group may receive zero or more. In how many ways can the packs be shared? Instructions: 1. Form groups of three or four. For each situation, first list a few possible distributions by hand. | Activity A.2. Appreciating Lesson Relevance Purpose: Motivate the two new methods using a familiar relief setting. Situation 1 points to distributing distinct objects, which extends the multiplication principle. Situation 2 introduces the Stars and Bars. Learners only need to begin, not finish; the gap serves as the lesson hook. Strategy for facilitating: Have groups list a few cases first. For Situation 1, draw out that each of the 5 kits independently picks 1 of 3 leaders. For Situation 2, allow the listing process to become tedious so that learners recognize the need for a formula. Do not present the formulas yet; they will be derived in section B.2. them. |

-----

|  | 2. Decide whether the items are distinct or identical, and whether order within a group matters. 3. Try to count Situation 1. Then try Situation 2 and notice why listing becomes hard. 4. Write one sentence on why distributing identical objects feels different from distributing different ones. Processing Questions: 1. In Situation 1, how is each kit's placement like a single step in the multiplication principle? 2. In Situation 2, why does naming who got which pack stop making sense? 3. Where did listing by hand become impractical, and what kind of rule would help? | Answer to the task: • Situation 1. Each of the 5 distinct kits picks 1 of 3 leaders, so 3 × 3 × 3 × 3 × 3 = 3 raised to 5 = 243 ways. Learners are not expected to reach this yet; an organized attempt is enough. • Situation 2. Sharing 10 identical packs among 4 groups is counted by stars and bars in B.2: C(10 + 4 - 1, 4 - 1) = C(13, 3) = 286. Here a started list is enough. Facilitating Reflection: PQ1. Intent: Connect to the multiplication principle. Answer: placing each kit is one step with 3 options, and the steps multiply, which is why distinct-object distribution extends the multiplication rule. PQ2. Intent: Expose why identical objects differ. Answer: identical packs cannot be told apart, so naming who got which pack double counts; only how many each group gets matters. PQ3. Intent: create the need for a rule. Answer: Listing grows fast, so a counting rule that does not require writing every case is needed, which the lesson supplies. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Community Outreach Donation Drive Your class is sorting donated items for families affected by a calamity. You will help share the items among evacuation centers fairly and systematically. The task has two parts. Part I (different items, with a rule). The drive received distinct items: 3 sacks of rice (Rice A, B, C), 2 boxes of canned goods (Canned A, B), and 4 hygiene kits (Kit A, B, C, D). These go to 3 centers (Center 1, 2, 3). Each item is unique and must go to exactly one center. Rule: each center must receive at least one rice sack. Canned goods and kits have no rule. In how many ways can the items be assigned? Part II (identical items). The drive also received 10 identical food packs for the same 3 centers. Only the number each center receives matters. In how many ways can the 10 packs be shared, if a center may receive zero or more? | Activity B.1. Exploring Key Concepts Purpose: Surface both distribution types in one setting before formal rules. Part I is distinct objects into labeled groups with a restriction; Part II is identical objects into labeled groups. The phase produces the counts that B.2 then explains. Procedure for the teacher: 1. For Part I, guide groups to split the work by item type. The rice carries the rule, so settle it first; the canned goods and kits are then free. 2. For Part II, demonstrate one small Stars-and-Bars picture (for example, 4 packs and 2 bars), then let groups extend it. 3. Ask groups to state the method in words before any formula, and to justify why Part I and Part II differ. Answer to the task (Part I): There are 4,374 ways. Reasoning by item type: • Rice: 3 distinct sacks to 3 centers with each center getting at least one. With exactly 3 sacks and 3 centers, each center gets |

-----

| Instructions: 1. Work in groups of three to five. For each part, first decide whether the items are distinct or identical, and whether order within a center matter. 2. For Part I, handle the rice first because it carries the rule, then the canned goods and kits. 3. For Part II, draw the packs as stars and the dividers between centers as bars before counting. 4. Write your reasoning, compare with another group, and prepare one insight to share. Processing Questions: 1. In Part I, why can each canned box and each kit be placed independently, while the rice cannot? 2. In Part II, why does writing names on the packs not help, and what does help instead? 3. What is the key difference between Part I and Part II that changes the whole method? | exactly one sack, so this is an arrangement of 3 distinct sacks among 3 centers: 3! = 6 ways. • Canned goods: 2 distinct boxes, each freely placed in 1 of 3 centers: 3 × 3 = 32 = 9 ways. • Hygiene kits: 4 distinct kits, each freely placed in 1 of 3 centers: 34 = 81 ways. • By the multiplication principle: 6 × 9 × 81 = 4,374 ways. Answer to the task (Part II): Sharing 10 identical packs among 3 centers, with empty centers allowed, is counted by stars and bars: C(10 + 3 - 1, 3 - 1) = C(12, 2) = 66 ways. Facilitating Reflection: PQ1. Intent: Separate free placement from a constrained one. Answer: each canned box or kit may go to any center, so its placement is an independent step; the rice is constrained because every center must get at least one, which links the placements together. PQ2. Intent: Justify the shift for identical objects. Answer: identical packs cannot be told apart, so naming them double counts; only the number per center matters, which stars and bars counts directly. PQ3. Intent: Name the controlling feature. Answer: in Part I the objects are distinct, so which item goes where matters; in Part II they are identical, so only the counts matter, and that changes the method from multiplication to stars and bars. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Part A. Distributing Distinct Objects into Labeled Groups Here the objects are different from one another, and the groups are labeled (Center 1 is not Center 2). Two cases come up often. Case 1: each object may go to any group, with no fixed sizes. Each of the n distinct objects independently chooses one of the r groups, so the steps multiply: number of ways = rn (r groups, n distinct objects). | Activity B.2. Deepening Conceptual Understanding Big ideas: Distribution problems split by two questions. Are the objects distinct or identical? Are the group sizes free or fixed, and are there rules? Distinct and free gives r raised to n. Distinct with fixed sizes gives the multinomial form. Identical gives stars and bars. Rules are handled by subtraction. Strategy for the discussion (what to highlight): • Definitional strand. Fix the terms distinct, identical, and labeled groups, and the three forms r raised to n, n! / (n 1! … nk!), and C(n + r - 1, r - 1). Tie each back to B.1. • Relational strand. Show r raised to n as the multiplication principle repeated, and the fixed-size form as a product of |

-----

combinations. Stars and Bars reframes a distribution as a

![](img_p52_1.png)

selection of bar positions, linking back to combinations.

- Procedural strand. Give a fixed order: name distinct or identical, name free or fixed sizes, note any rule, then compute and subtract violations if needed.

**Figure 1. Distributing distinct objects into labeled groups when each**

*object chooses freely*

**Worked Example 1. Distribute 4 distinct books among 3 students,**

with no rule.

34 = 81 ways.

**Worked Example 2. Assign each of 5 different students to exactly one**

of 3 clubs.

35 = 243 ways.

**Case 2: the groups must have fixed sizes. When each group size is**

set in advance, choose which objects fill each group in turn. This gives a product of combinations, which equals the multinomial form:

!

where the ni are the group sizes.

1! · 2! · … · !

**Worked Example 3. Split 6 distinct tasks among 3 committees, so**

each committee gets exactly 2. Choose 2 of 6 for the first, 2 of the remaining 4 for the second, and the last 2 for the third: C(6, 2) · C(4, 2) · C(2, 2) = 15 · 6 · 1 = 90, the same as

**Restrictions by subtraction. When a rule forbids some placements,**

count all ways, then subtract the ones that break the rule.

**Worked Example 4 (no group empty). Place 4 distinct balls into 2**

labeled boxes so that no box is empty. All placements: 24 = 16. Remove the 2 that put every ball in one box:

16 - 2 = 14 ways.

###### Answers to the Guided Practice:

1. Distinct, free: 34 = 81.
2. Distinct, each station at least one: 25 - 2 = 30.
3. Distinct, each winner at least one: 24 - 2 = 14.
4. Identical: C(6 + 3 - 1, 3 - 1) = C(8, 2) = 28.
5. Identical, empties allowed: C(10 + 4 - 1, 4 - 1) = C(13, 3) = 286.

###### Misconceptions and the teacher move for each:

- Using r raised to n when the group sizes are fixed. Move: return to Worked Example 3 and count by choosing which objects fill each group, showing the product of combinations.
- Using a permutation for identical objects. Move: try to list distributions with named objects and show the repeats, then switch to stars and bars.
- Adding a reserved amount but forgetting to reduce the total in

the at-least case. Move: rewrite the substitution xi = yi + 2 and re-derive the new total.

*Teacher's Technical Note: The fixed-size form n! / (n1! … nk!) counts* placements into labeled groups. If the groups are interchangeable (unlabeled) and some have equal sizes, divide by the number of ways to permute the equal-size groups. The lesson and the Performance Task use labeled groups, so no such division is needed here.

6!

= 90.

2! · 2! · 2!

###### Facilitating Reflection:

**PQ1. Intent: Separate the three distinct distribution forms.**

Answer: use r raised to n when each object freely picks a group and sizes are not fixed; use the fixed-size form when the group sizes are given; use stars and bars when the objects are identical.

**PQ2. Intent: enforce the analyze-first habit.**

Answer: distinct objects make which-goes-where matter, while identical objects make only counts matter, and that single distinction selects between multiplication-type counting and stars and bars.

-----

**Part B. Distributing Identical Objects into Labeled Groups (Stars PQ3. Intent: Justify subtraction.**

**and Bars)** Answer: counting all placements then removing the ones that

break a rule is the complement method; it works for no-empty-

![](img_p53_1.png)

group and caps, as long as you do not double subtract overlapping violations.

Now the objects are identical, so only the count in each group matters. Picture the n objects as stars in a row. To split them into r groups, insert r - 1 bars. Each placement of the bars gives one distribution, so count the ways to choose the bar positions among the n + r - 1 symbols:

C(n + r - 1, r - 1) (n identical objects, r groups, empty groups allowed).

**Figure 2. Stars and bars for identical objects into labeled groups**

**Worked Example 5 (basic). Distribute 10 identical candies among 4**

children, any number each.

C(10 + 4 - 1, 4 - 1) = C(13, 3) = 286 ways.

**Worked Example 6 (each group at least k). Give 10 identical candies**

to 3 students, so each gets at least 2. First set aside 2 for each student (6 in all). Share the remaining 4 freely by letting xi = yi + 2:

y1 + y2 + y3 = 4, so C(4 + 3 - 1, 3 - 1) = C(6, 2) = 15 ways.

**Worked Example 7 (each group at most m). Give 9 identical candies**

to 3 children, so no child gets more than 4. Count all distributions, then subtract those that break the cap. All ways: C(9 + 3 - 1, 3 - 1) = C(11, 2) = 55. A child breaks the cap by getting 5 or more; set that child's share to 5 plus extra, leaving 4 to share, which is C(6, 2) = 15. There are 3 children who could break it, and two cannot break it at once since 5 + 5 > 9:

55 - 3 · 15 = 55 - 45 = 10 ways.

###### Part C. Choosing the Correct Technique

Most counting problems fit one of the structures below. Read the structure first, then pick the tool. Figure 3 is a quick reference.

-----

![](img_p54_1.png)

**Figure 3. Choosing a counting technique from the structure of the**

*problem*

###### Quick classification:

- Assign 4 different tasks to 3 students, any load: distinct into labeled groups, free, so 34.
- Distribute 6 identical balls into 4 boxes: identical into labeled groups, so stars and bars.
- Choose 3 leaders from 10, no roles: a selection, so C(10, 3).

###### Guided Practice:

For each item, first name the structure, then compute. Solutions are with your teacher.

1. Four different students are assigned to exactly one of three committees. How many assignments are there?
2. Five different parcels go to two delivery stations, with each station receiving at least one. How many distributions are valid?
3. Four distinct prizes go to two winners so that each winner gets at least one. How many ways?
4. Six identical candies are shared among three children, any number each. How many ways?
5. Ten identical balls go into four boxes, empty boxes allowed. How many ways?

###### Processing Questions:

1. How do you tell whether a problem needs r raised to n, the fixedsize form, or stars and bars?
2. Why does identifying distinct versus identical objects come before choosing a formula?
3. How does subtraction handle a rule such as no empty group or a cap per group?

-----

|  | B.3. Developing Mastery (Complete instructions for learners are on | the Learning Activity Sheet.) |
|---|---|---|
|  | Activity B.3. Practicing Purpose: Build fluency in naming the structure and applying the right stars and bars. The set moves from one technique to layered ones. Answers with full solutions: • Problem 1: 72. Split 6 distinct items into 3 committees of 2: 6! / (2! together: place that pair in 1 of 3 committees (3 ways), then split the C(4, 2) = 6, giving 3 × 6 = 18. Valid: 90 - 18 = 72. • Problem 2: 66. Identical snacks into 3 labeled groups: C(10 + 3 - 1, • Problem 3: 95,135,040. Select and assign 5 of 12 to roles: P(12, 5) among 5 leaders: C(10 + 5 - 1, 5 - 1) = C(14, 4) = 1,001. Multiply: • Task 1: 630. Each center has at least 2 and the total is 7, so the ways). For each, the number of ways to place the 7 distinct items is • Task 2: 455. Identical packs into 4 labeled centers: C(12 + 4 - 1, 4 bars in a row. • Task 3: 498,960. Select and assign 4 of 9 to roles: P(9, 4) = C(9, 4) C(8 + 4 - 1, 4 - 1) = C(11, 3) = 165. Multiply: 3,024 · 165 = Note on Task 1: This item is harder than the others because the rule each with size casework, not r raised to n. Mark it as a stretch item and model Facilitating Reflection: PQ1. Intent: Sequence the stages. Answer: order the steps as they happen in the situation, usually PQ2. Intent: guard the restrictions. Answer: a missing item or an unmet minimum makes a distribution minimum before counting. PQ3. Intent: reflect on setup difficulty. Answer: multi-step or fixed-size problems are hardest because the wrong formula. | Learned Skills form, including multi-step problems that combine a permutation with · 2! · 2!) = 90. Subtract the cases with Notebook and Planner remaining 4 items into the other two committees of 2, which is 3 - 1) = C(12, 2) = 66. = C(12, 5) · 5! = 792 · 120 = 95,040. Share 10 identical supplies 95,040 · 1,001 = 95,135,040. only sizes are 3, 2, 2 in some order. Choose which center gets 3 (3 7! / (3! · 2! · 2!) = 210. Total: 3 × 210 = 630. - 1) = C(15, 3) = 455. The stars-and-bars setup is 12 stars and 3 · 4! = 126 · 24 = 3,024. Share 8 identical kits among 4 volunteers: 498,960. center at least 2 fixes the group sizes and needs the fixed-size form the size reasoning explicitly. select, then arrange, then distribute, and multiply the stage counts. invalid, so the setup must reflect all-distributed and any per-group structure must be read in layers; naming each layer first prevents the |
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Campus Innovation Fair: Logistics Report Goal: Help the school plan a Campus Innovation Fair by counting the ways materials, teams, and resources can be assigned and distributed. Role: You are on the Student Logistics and Planning Committee. | Activity C.1. Making Real-World Connections Purpose: Have learners select and apply the right technique across four authentic scenarios that span distinct fixed-size distribution, identical distribution with a minimum, selection with a restriction, and a multi-step assignment. This is the integrative phase for Objectives 2, 4, 5, and 6. |

-----

**Audience: The school administration and event coordinators who will**

use your numbers to finalize the setup.

**Product: A short Logistics Report with a complete, justified solution to**

each scenario, the technique named for each, and a one-paragraph reflection on choosing techniques. Solve each scenario. Name the structure, show the setup, and compute.

###### Scenario 1. Equipment Rooms

There are 9 distinct devices to place into 3 rooms (A, B, C), with exactly 3 devices per room. The projector, one specific device, must be placed in Room A. How many placements are possible?

- Objects and groups: 9 distinct devices into 3 labeled rooms of fixed size 3
- Restriction: the projector is fixed in Room A
- Technique: fixed-size distribution (multinomial) after fixing the projector

###### Scenario 2. Innovation Kits

There are 20 identical innovation kits for 4 teams (Science, Technology, Arts, Entrepreneurship). Each team must receive at least 3 kits. How many distributions are possible?

- Objects and groups: 20 identical kits into 4 labeled teams
- Restriction: each team at least 3
- Technique: stars and bars after reserving the minimum

###### Scenario 3: Host Team

From 12 student volunteers, a host team of 4 will be chosen. Two specific volunteers have a scheduling conflict and cannot both be on the team. How many valid host teams are possible?

- Objects and groups: choose 4 of 12, order does not matter
- Restriction: the two specific volunteers cannot both be chosen
- Technique: combination, then subtract the invalid teams

###### Full solutions:

- Scenario 1. 560. Fix the projector in Room A. The remaining 8 distinct devices fill Room A (2 more), Room B (3), and Room C (3): 8! / (2! · 3! · 3!) = 560. Without the fixed projector the count would be 9! / (3! · 3! · 3!) = 1,680.
- Scenario 2. 165. Reserve 3 kits for each team (12 in all), then

share the remaining 8 freely: C(8 + 4 - 1, 4 - 1) = C(11, 3) = 165.

- Scenario 3. 450. All teams: C(12, 4) = 495. Teams containing both specific volunteers: choose 2 more from the other 10, C(10, 2) = 45. Valid: 495 - 45 = 450.
- Scenario 4. 203,212,800. Assign leaders: P(10, 5) = 30,240. Assign themes: P(8, 5) = 6,720. Multiply: 30,240 · 6,720 = 203,212,800.

###### Streamlined scoring guide (per scenario, 5 points): 3 points for

the correct count with a correct setup; 1 point for naming the technique and why it fits; 1 point for clear, complete work. The reflection paragraph is scored separately for naming techniques and connecting them to the planning decision.

###### Facilitating Reflection:

**PQ1. Intent: reinforce structure reading.**

Answer: identical objects point to stars and bars, while distinct objects point to r raised to n for free placement or the fixed-size form when sizes are set; order signals a permutation.

**PQ2. Intent: reflect on restrictions.**

Answer: most restrictions are handled by fixing a forced placement or by subtracting the invalid cases, as in Scenarios 1 and 3.

**PQ3. Intent: Connect to practice.**

Answer: counting the options in advance lets planners compare arrangements and allocate limited resources fairly and efficiently.

###### Scenario 4: Stations

There are 5 event stations. From 10 student leaders, assign exactly one leader to each station, and from 8 project themes, assign exactly one theme to each station. How many valid configurations are possible?

-----

- Objects and groups: 10 distinct leaders and 8 distinct themes into 5 stations
- Restriction: each station gets exactly one leader and one theme
- Technique: permutation for each assignment, then multiply

###### Processing Questions:

1. How did you decide, for each scenario, whether the objects were distinct or identical and whether order mattered?
2. Which restriction was hardest to apply, and how did you handle it?
3. How can combinatorial thinking improve planning for a real event?

###### C.2. Making Generalization

###### Activity C.2. Wrapping up the Lesson

###### One Map for the Counting Techniques

Pull the lesson together in your own words. Build a small concept map of the counting techniques, then write a short conclusion. Use Figure 3 in B.2 as a memory aid.

###### Instructions:

1. Draw five branches: addition principle, multiplication principle, permutation, combination, and distribution.
2. Under distribution, split into two leaves: distinct objects into labeled groups, and identical objects into labeled groups.
3. On each branch, write the deciding question (for example, does order matter, are the objects identical, are the sizes fixed) and the matching formula.
4. Write a conclusion of three to five sentences on how you choose a technique from the structure of a problem.

###### Processing Questions:

1. In one sentence, how do you decide among a permutation, a combination, and stars and bars?
2. Why does the question distinct or identical come before choosing any formula?
3. When does a problem need more than one technique, and how do you combine them?

###### Activity C.2. Wrapping up the Lesson

**Purpose:** Have learners state and organize the lesson's generalization without new computation. The concept map consolidates Objective 5 and frames the multi-step view in Objective 6.

**Target conclusion in final form: A written rule of this shape: first**

read the structure. If you are making a sequence of choices, multiply. If you are arranging, use a permutation; if only selecting, use a combination. If you are distributing into labeled groups, ask whether the objects are distinct (use r raised to n for free placement, or the fixed-size form when sizes are set) or identical (use stars and bars). Handle rules by subtracting the invalid cases, and combine techniques stage by stage for multi-step problems.

**Strategy for facilitating: Eliciting prompt: ask, in one sentence,**

how to choose a technique for any counting problem. Fallback prompt, when a map is thin: ask which single feature, order or identical objects or fixed sizes, decides the branch.

###### Possible incomplete or incorrect conclusions and how to address them:

- Mapping distribution to only stars and bars. Address by pointing to Figure 3 and the distinct case r raised to n.
- Claiming distinct objects always use r raised to n. Address with Worked Example 3 in B.2, where fixed sizes need the multinomial form.

-----

| C.3. Evaluating Learning (Complete instructions for learners on the | Learning Activity Sheet.) |
|---|---|
| Purpose: Measure technique selection and computation independently and distributions. Item alignment: Part I covers Objectives 1, 2, 3, 4, and 5. Part II covers 5. Answer Key, Part I (Multiple Choice): 1. A. The three posts are distinct, so P(12, 3) = 12 × 11 × 10 = 1,320. 2. C. A group is unordered, so C(10, 3) = 120. 3. B. One of each by the multiplication principle: 3 × 4 × 5 = 60. 4. D. Identical candies into 3 groups: C(5 + 3 - 1, 3 - 1) = C(7, 2) = 21. 5. B. A permutation arranges distinct objects in order. Answer Key, Part II (Constructed Response): 1. (a) C(12, 4) = 495. (b) After choosing the committee, the chairperson 2. Give one pencil to each student first, then distribute the remaining 4 Answer Key, Part III (True or False with Reasoning): 1. True. Order matters for a permutation and does not matter for a 2. True. Stars and Bars count distributions of identical objects into | across the unit: permutations, combinations, the basic principles, Objectives 1, 2, 3, 4, and 6. Part III covers Objectives 1, 3, 4, and is one of the 4, so 495 × 4 = 1,980. freely: C(4 + 3 - 1, 3 - 1) = C(6, 2) = 15. combination. distinct groups. |

|  | • Treating every restriction as a new formula. Address by recalling that subtraction of invalid cases handles most rules. Facilitating Reflection: PQ1. Intent: State the decision. Answer: use a permutation when order matters, a combination when it does not, and stars and bars when identical objects are shared into groups. PQ2. Intent: order the questions. Answer: whether objects are distinct or identical decides between multiplication-type counting and stars and bars, so it must come first. PQ3. Intent: Frame multi-step work. Answer: a problem needs several techniques when it has stages such as select, then arrange, then distribute; count each stage and multiply. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

-----

3. False. An unordered group of 3 from 10 is C(10, 3) = 120, not P(10, 3) = 720.
4. True. The multiplication principle multiplies the number of choices at each stage, whether or not a later stage depends on an earlier one.
5. False. Stars and bars is for identical objects into groups; arranging distinct objects in a row uses a permutation.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

**Purpose: Provide a remedial track that secures method identification and basic distribution, and an enhancement track that pushes into**

restricted and multi-step distribution. Both serve Objectives 2, 4, 5, and 6.

###### Answers (Remediation):

- A. 1. Combination, C(10, 2) = 45. 2. Permutation, 5! = 120. 3. Multiplication, one of each. 4. Distribution (stars and bars), C(6, 2) =
  15. 5. Permutation, P(5, 3) = 60.
- B. 1. 3 different books, each to 1 of 2 students: 23 = 8. 2. 4 different tasks, each to 1 of 3 workers: 34 = 81.
- C. 1. C(2 + 2 - 1, 2 - 1) = C(3, 1) = 3. 2. C(3 + 2 - 1, 2 - 1) = C(4, 1) = 4.
- D. The distributions are (3, 0), (2, 1), (1, 2), and (0, 3): 4 ways, which agrees with C(4, 1) = 4.

###### Answers (Enhancement):

- A. 1. Distinct objects into labeled groups, with subtraction for the restriction. 2. Combination then permutation, combined by the multiplication principle. 3. Stars and bars, C(6 + 4 - 1, 4 - 1) = C(9, 3) = 84.
- B. 1. Choose Student A's 2 books from 6, then place the other 4 books freely with the other 2 students: C(6, 2) × 24 = 15 × 16 = 240. 2. (Challenge.) Count placements of 5 distinct prizes to 4 winners with each winner at most 2. The only size patterns are (2, 2, 1, 0) and (2, 1, 1, 1). For (2, 2, 1, 0): choose which winners hold each size, 4! / (2! · 1! · 1!) = 12, times 5! / (2! · 2! · 1!) = 30, giving 360. For (2, 1, 1, 1): 4 ways to pick the winner with two, times 5! / (2! · 1! · 1! · 1!) = 60, giving 240. Total: 360 + 240 = 600.
- C. 1. C(8 + 3 - 1, 3 - 1) = C(10, 2) = 45. 2. C(7 + 3 - 1, 3 - 1) = C(9, 2) = 36.
- D. Booths: each of 4 volunteers to 1 of 3 booths, 34 = 81 (multiplication). Posters: identical into 3 departments, C(6 + 3 - 1, 3 - 1) = C(8,
  2) = 28 (stars and bars). Committee: Select and assign 5 of 10 to roles, P(10, 5) = 30,240 (combination then permutation).

-----

| V. ASSESSMENT | ASSESSMENT | Note on Enhancement B2: This challenge needs size casework and is harder than the lesson's worked examples. Offer it only to learners ready for the extra step and model the two size patterns explicitly. To evaluate learners' success in attaining the intended learning competencies, the assessment tools and strategies provided on the link in the table of contents can be utilized to measure understanding, skills, and application of concepts. | Note on Enhancement B2: This challenge needs size casework and is harder than the lesson's worked examples. Offer it only to learners ready To evaluate learners' success in attaining the intended learning competencies, the assessment tools and strategies provided on the link in |
|---|---|---|---|
| VI. | REFLECTION | To assess and evaluate the effectiveness of the instruction, as well as to identify challenges and plan for improvements in this unit, teachers are encouraged to answer the reflective questions provided in the link indicated in the table of contents. |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

###### UNIT 2. PROBABILITY

###### I. LEARNING GOALS

| Content | The learners demonstrate knowledge and understanding of the probability of an event and of the rules governing the addition of probabilities, |
|---|---|
| Standard | conditional probability, and independence of events. |
| Performance | By the end of the unit, the learners are able to solve problems involving probabilities. |

###### Standard

**Learning** *The learners:* **Competencies** 1. illustrate sample spaces and events by listing elements;

2. calculate the probability of an event by (a) listing and (b) using counting techniques;
3. determine if two or more events are mutually exclusive;
4. calculate the probability of the complement of an event and the union of two events;
5. differentiate between simple and conditional probability;
6. calculate conditional probabilities;
7. determine if two events are independent; and
8. solve probability problems using the laws of probability and Bayes' Rule.

| II. REFERENCES | and | MATERIALS |
|---|---|---|
| Textbook and | • | Department of Education. (2016). K to 12 Curriculum Guide: Mathematics. Bureau of Curriculum Development. |
| Modules | • | Department of Education. (2017). Senior high school core subject: General Mathematics teacher's guide. Bureau of Learning Resources. |
|  | • | Department of Education. (2017). Senior high school learner's material: General Mathematics. Bureau of Learning Resources. |
|  | • | Bluman, A. G. (2018). Elementary statistics: A step-by-step approach (9th ed.). McGraw-Hill Education. |
|  | • | Creswell, J. W. (2014). Educational research: Planning, conducting, and evaluating quantitative and qualitative research (4th ed.). Pearson |

Education.

- Grinstead, C. M., & Snell, J. L. (2012). Introduction to probability (2nd rev. ed.). American Mathematical Society.
- Larson, R., & Hostetler, R. P. (2013). Precalculus with limits (3rd ed.). Cengage Learning.
- Triola, M. F. (2014). Elementary statistics (12th ed.). Pearson Education. **Video lessons** Super Simple Explanation of Bayes Theorem! https://www.youtube.com/watch?v=uzkc-qNVoOk&list=PLU5aQXLWR3\_x1bjE2rbvRn8sse81AUYZk https://www.youtube.com/watch?v=X6usGgwXFyU https://www.youtube.com/watch?v=SkidyDQuupA https://www.youtube.com/watch?v=D7B17klZmAU https://www.youtube.com/watch?v=tHDiFMU6oY8

| Materials and | • Scientific calculators (physical or mobile-based) |
|---|---|
| EdTech | • Visual aids (charts, diagrams, probability tables, or 3D models) |

-----

| III. CONTENT IV. OBJECTIVES | • Presentation materials (PowerPoint slides or interactive whiteboard resources) • Learner worksheets (printed or digital format) • LCD projector, smart TV, or computer display for lesson presentation • Activity cards or station task sheets for group work • Internet-enabled device (optional, for digital simulations or enrichment activities) At the end of the lesson, the learners are expected to: 1. examine simple random experiments (coin tosses, dice rolls, card draws) to identify possible outcomes: 2. define sample space as the set of all possible outcomes of a random experiment; 3. define an event as a subset of the sample space; 4. list the elements of sample spaces and events for given experiments; 5. calculate the probability of an event with equally likely outcomes by listing: P(E) = \|\| impractical; and 7. interpret probability values within the range [0, 1] and explain the meaning of P(E) = 0 and P(E) = 1. | Presentation materials (PowerPoint slides or interactive whiteboard resources) LCD projector, smart TV, or computer display for lesson presentation Internet-enabled device (optional, for digital simulations or enrichment activities) 1. examine simple random experiments (coin tosses, dice rolls, card draws) to identify possible outcomes: 2. define sample space as the set of all possible outcomes of a random experiment; 4. list the elements of sample spaces and events for given experiments; 5. calculate the probability of an event with equally likely outcomes by listing: P(E) = \|\| 7. interpret probability values within the range [0, 1] and explain the meaning of P(E) = 0 and P(E) = 1. |
|---|---|---|
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Guess and List the Outcomes You will visit five stations. At each station you will perform or imagine a simple chance experiment, then list every result that could happen. Do not compute anything yet. Just make your list as complete as you can. |  |

###### Materials:

#### • a coin • a standard six-sided die • a small bag holding three balls, colored red, blue, and green • three index cards numbered 1, 2, and 3

###### Instructions:

1. Go to each station in any order.
2. For each station, list all the results you think could happen.
3. Write each list in the worksheet. Use short labels, such as H for Heads and T for Tails.
4. Check each list once more. Ask yourself whether anything is missing and whether anything is repeated.

###### Lesson 2.1. Probability of an Event

;

||

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness

**Purpose: Surface what learners already do informally, that is, list**

the things that can happen in a chance experiment, and the idea that a list should be complete. The lesson will name this list the sample space and build the measure of chance on top of it.

**\\**

###### Procedure for the teacher:

1. Set up the five stations before class. Group learners and assign a starting station.
2. Require each group to list outcomes before counting or judging chance.
3. Circulate. Prompt for completeness with the question, could anything else happen?
4. Collect the worksheets to use during the reflection.

###### Answer to the task: The completed worksheet is below. Each entry

is the full list of outcomes; that is, the sample space for that station.

###### All possible results you can Station and experiment list

1. Toss a coin once. {Heads, Tails}

-----

**All possible results you can** 2. Toss a coin twice. {HH, HT, TH, TT}

###### Station and experiment

**list** 3. Roll the die once. {1, 2, 3, 4, 5, 6}

| 1. Toss a coin once. | 4. Draw one ball from the bag. | {Red, Blue, Green} |
|---|---|---|
| 2. Toss a coin twice. | 5. Draw one number card. | {1, 2, 3} |
| 3. Roll the die once. | Station 2 gives four results, not | three, because the two tosses are |

ordered. The outcome tree shows why.

4. Draw one ball from the bag.

![](img_p62_1.png)

5. Draw one number card.

###### Processing Questions:

1. At which station was it hardest to be sure you had listed every result? Why?
2. How did you make sure your list had no repeats and nothing missing?
3. Which station had the most possible results, and how many were there?
4. When we say a result is possible, what do we mean? Give one result that is not possible at any station.

**Figure 1. Outcome Tree for Tossing a Coin Twice**

*Teacher's Technical Note. Learners need not assume equal likelihood* at this phase. The formal treatment of equally likely outcomes is reserved for B.2. The tree models a systematic listing method that prevents missing or repeating outcomes, which matters most at Station 2.

###### Facilitating Reflection:

PQ1. Intent: surface the difficulty of guaranteeing completeness. Answer: Station 2, because two stages combine. Learners often miss TH or merge HT and TH. PQ2. Intent: name a systematic method. Answer: pairing, a table, or a tree, rather than random guessing. PQ3. Intent: connect listing to counting. Answer: the die station, with six results, is the largest among the single-stage experiments. PQ4. Intent: introduce the boundary idea of an impossible result. Answer: possible means it can actually occur; an impossible result is, for example, rolling a 7 on the die.

-----

###### A.2. Establishing the Purpose of the Lesson

###### Activity A.2. Appreciating Lesson Relevance

###### Will Your Ticket Win?

At the barangay fiesta, the raffle drum holds 200 tickets. You bought exactly one ticket. There is one grand prize. The draw has not happened yet, and you are wondering how likely it is that your ticket is the one drawn.

Look at the scale below. It runs from a result that cannot happen to a result that is sure to happen. Place an arrow where you think your chance of winning belongs.

###### Activity A.2. Appreciating Lesson Relevance Purpose: Create the felt need for a precise measure of chance.

Learners can place the event on a scale but cannot yet compute an exact value. That gap motivates the formal definition of probability in B.

###### Procedure for the teacher:

1. Present the single scenario. Do not add variations.
2. Have each learner mark the scale individually, then share a few placements aloud.

![](img_p63_1.png)

3. Resist computing the answer now. Mark probability as a term to be defined in B.2.

**Answer to the task: The chance is small but not zero, so most**

learners will place the arrow near the low end, between Impossible and Unlikely. Name the value only informally as 1 in 200. The exact computation is deferred to B. *Teacher's Technical Note. Do not introduce the formula here. A.2* orients and motivates; B defines. The aim of this phase is the felt need for a number, not the number itself. A learner could mark the scale without having met the new concept, which confirms A.2 is **Figure 2. A Scale of Chance from Impossible to Certain** doing its job.

###### Processing Questions:

1. Where on the scale did you place your chance of winning, and why?
2. What would have to change for your chance to move toward Likely?
3. Can you put an exact number on your chance right now? If not, what would you need to know?

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts

###### Facilitating Reflection:

PQ1. Intent: elicit a qualitative judgment and its reason. Answer: near the low end, because one ticket among many. PQ2. Intent: Surface the structure behind the chance. Answer: fewer tickets or more prizes raises the chance, which foreshadows the roles of favorable and total counts. PQ3. Intent: reveal that the counts alone are not yet a number. Answer: the counts are already given, one prize in two hundred tickets; what is missing is a rule to turn the counts into a number.

###### Activity B.1. Exploring Key Concepts

**How Big Is the Chance? Purpose: Lead learners to discern that, when outcomes are equally**

You will work with one fair die. The die can land on 1, 2, 3, 4, 5, or 6. likely, chance is the ratio of favorable outcomes to the total number Below are four sets, each describing a different result to look for. The of outcomes, and that the extremes are 0 and the full set. favorable results are shaded in each set.

-----

###### Strategy: Varying the Event on a Fixed Sample Space. The

![](img_p64_1.png)

example set holds one feature constant and varies another so learners can discern the critical feature of probability (Marton, 2015; Watson & Mason, 2006). Guided discovery is the modality (Alfieri et al., 2011; Mayer, 2004).

###### Example space (variation plan):

• Held constant: the sample space S = {1, 2, 3, 4, 5, 6}, six equally • Varied: the event E, and therefore the count of favorable

- Set A, get a 5: E = {5}, n(E) = 1. Set B, even: E = {2, 4, 6}, n(E) =
  3. Set C, 1 to 6: E = {1, 2, 3, 4, 5, 6}, n(E) = 6. Set D, get a 7: E =

**Figure 3. One Die, Four Different Events to Look For** { }, n(E) = 0.

For each set, count how many of the six faces are favorable. Then arrange the four sets from least likely to most likely. Do not use a formula yet. Reason from the counts.

###### Favorable Set faces

A: get a 5 B: get an even number C: get a number from 1 to 6 D: get a 7

###### Processing Questions:

1. As you move from Set A to Set C, what stays the same and what changes?
2. Which set is impossible? Which is certain? How many favorable faces does each of these have?
3. Could any two of these sets have the same chance? Why or why not?
4. Write a rule, in your own words, for turning the counts into a measure of chance.

###### Procedure for the teacher:

1. Display the four sets. Have learners count favorable faces and rank the sets.

| How many | Order (1 = | 2. Withhold the formula. Elicit the rule from learners through PQ4. |
|---|---|---|
| out of 6 | least likely) | 3. Foreground that only the favorable count changes while the total of 6 stays fixed. |

###### Answer to the task: The completed worksheet is below. The order

runs from least likely to most likely: D, then A, then B, then C.

**Favorable How many out Order (1 =**

###### Set faces of 6 least likely)

| A: get a 5 | 5 | 1 | 2 |
|---|---|---|---|
| B: get an even number | 2, 4, 6 | 3 | 3 |
| C: get a number 1, from 1 to 6 | 2, 3, 4, 5, 6 | 6 | 4 |
| D: get a 7 | none | 0 | 1 |

###### Facilitating Reflection:

PQ1. Intent: isolate the critical feature. Answer: the sample space and the total of 6 stay the same; only the favorable count changes. PQ2. Intent: name the extremes. Answer: Set D is impossible with 0 favorable faces; Set C is certain with 6 favorable faces.

-----

| B.2. Discussing the Concept | PQ3. Intent: reason from counts to chance. Answer: two sets tie only if they have the same favorable count over the same total; none of these four tie. PQ4. Intent: articulate the rule. Answer: chance equals favorable outcomes over total outcomes. This is formalized in B.2 as P(E) = n(E) over n(S). |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Naming and Measuring Chance We now name the ideas you have been using and write a formula for chance. Definitions: • Random experiment: an action whose result cannot be predicted with certainty, although all possible results are known. • Outcome: a single possible result of the experiment. • Sample space S: the set of all possible outcomes. We write n(S) for the number of outcomes in S. • Event E: a subset of the sample space. A simple event has one outcome; a compound event has more than one. We write n(E) for the number of outcomes in E. When all outcomes are equally likely, the probability of an event E is: () () = () () = \|\| , where \|E\| and The same formula is sometimes written \|\| \|S\| count the elements of E and S. Worked example 1 (from the die above): 3 1 ( ) = = 2 6 Here n(E) = 3 because E = {2, 4, 6}, and n(S) = 6. The impossible event has P = 0 over 6 = 0, and the certain event has P = 6 over 6 = 1. Worked example 2 (two dice): Roll two fair dice, one red and one blue. Each outcome is an ordered pair, so the sample space has n(S) = 36. The event both dice show the same number is {(1,1), (2,2), (3,3), (4,4), (5,5), (6,6)}, so n(E) = 6. | Activity B.2. Deepening Conceptual Understanding Purpose: Give the formal account of sample space, event, and classical probability, anchored to the die example from B.1. Strategy: From Counts to a Formula. Re-examine the B.1 example space so the formula explains what learners already ranked by count. Discussion strands: • Definitional. S is a set; E is a subset; n( ) counts elements. Misconception: confusing an outcome with an event. Teacher move: show a simple event as a one-element subset, such as {5}. • Relational. Connect to the A.1 listing and the B.1 ranking, and forward to the unit lessons on the complement, the union, and conditional probability (Department of Education, 2023). Misconception: treating probability as a property of one outcome rather than of an event. Teacher move: compute P for a simple and a compound event on the same S. • Procedural. Steps: name S and find n(S); name E and find n(E); form n(E) over n(S) and simplify; check that the result is between 0 and 1. Misconception: applying the formula when outcomes are not equally likely. Teacher move: contrast the fair die with a bent coin, where the formula does not apply. Answers to the worked examples: The highlighted lattice is the completed answer for the two-dice count, giving 6 favorable outcomes out of 36, which is 1 out of 6. The combination example gives 10 out of 28, which is 5 out of 14. Facilitating Reflection: PQ1. Intent: justify the product count. Answer: each die has 6 faces and the two are distinct, so there are 6 times 6 = 36 ordered pairs; (1, 2) differs from (2, 1). |

-----

PQ2. Intent: bound the ratio.

![](img_p66_1.png)

Answer: n(E) is at least 0 and at most n(S), so the ratio is between 0 and 1. PQ3. Intent: choose a counting tool. Answer: when the total is large and listing is impractical; use combinations when order does not matter.

**Figure 4. The 36 Outcomes of Rolling Two Dice, with Matching Pairs**

*Highlighted*

6 1 ( ) = 36 = 6

###### Worked example 3 (counting techniques):

From a group of 8 learners, 5 girls and 3 boys, two are chosen at random to represent the class. Listing all pairs is impractical, so we count with combinations. Recall that C(n, r) is the number of ways to choose r items from n when order does not matter. The number of possible pairs is n(S) = C(8, 2) = 28. The number of pairs that are both girls is n(E) = C(5, 2) = 10. So:

P(both girls) = 10/28 = 5/14

10 5 ( ℎ ) = 28 =

14

**Property: For any event E, 0 is less than or equal to P(E), which is**

less than or equal to 1. A probability of 0 means the event is impossible. A probability of 1 means the event is certain.

###### Processing Questions:

1. In the two-dice example, why is the sample space 36 and not 12 or 21?

-----

2. Why must every probability lie between 0 and 1? Use the formula to explain.
3. When would you choose to count with combinations instead of listing every outcome?

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity B.3. Practicing Learned Skills

**Purpose: Consolidate the procedure across structural variations, from a fixed sample space with a varied event, to a changed sample**

space, to counting techniques.

**Progression rule: Items 1 and 2 hold the sample space, one die, and vary the event. Items 3 and 4 change the sample space to a two-stage**

experiment, so the learner must find n(S) first. Item 5 requires counting techniques because listing is impractical. Items 1 and 2 are guided; items 3 to 5 are independent.

###### Answer to the task:

1. S = {1, 2, 3, 4, 5, 6}, E = {3, 6}; P = 2 over 6 = 1 over 3.
2. E = {5, 6}; P = 2 over 6 = 1 over 3.
3. S = {HH, HT, TH, TT}, E = {HT, TH}; P = 2 over 4 = 1 over 2.
4. n(S) = 36, n(E) = 6; P = 6 over 36 = 1 over 6.
5. n(S) = C(6, 2) = 15, n(E) = C(4, 2) = 6; P = 6 over 15 = 2 over 5.

**Minimum success criterion: At least 4 of the 5 items correct, with the sample space named in each.** **C.** ***C.1. Finding Practical Application*** **Demonstrating Activity C.1. Making Real-World Connections Activity C.1. Making Real-World Connections**

| Knowledge and | Reading Chance from a Survey | Purpose: Transfer the formula to an authentic data context, where |
|---|---|---|
| Skills | A barangay health worker surveyed 100 residents. Each resident said whether they exercise regularly and whether they have normal blood | the sample space is a real population and events are categories within it. |

pressure. The results are below.

**Scaffold for the Performance Task: This task scaffolds the unit High**

**Normal blood** Performance Task, Part A, which asks learners to compute a simple

**blood Total**

**pressure** probability from a two-way table, stating the sample space, the

**pressure**

favorable outcomes, and the final probability.

| Exercises regularly | 45 | 15 | 60 |  |
|---|---|---|---|---|
| Does not exercise regularly | 20 | 20 | 40 | Procedure for the teacher: |
| Total | 65 | 35 | 100 | 1. Present the table and require the sample space to be named |
| The health worker will draw one survey | card at random | to feature | in | before any computation. |
| a report. |  |  |  | 2. Have learners justify each favorable count by pointing to the cell |

-----

| Instructions: 1. State the sample space and n(S). 2. Find P(the resident exercises regularly). 3. Find P(the resident has normal blood pressure). 4. Find P(the resident exercises regularly and has normal blood pressure). Processing Questions: 1. What is the sample space here, and why is it the people rather than the categories? 2. A classmate says P(exercises) is 60 because 60 residents exercise. What did they leave out, and what is the correct value? 3. What assumption makes the random draw a fair model of picking one resident? | Answer to the task: 1. S = the 100 surveyed residents, so n(S) = 100. 2. P(exercises) = 60 over 100 = 3 over 5. 3. P(normal blood pressure) = 65 over 100 = 13 over 20. 4. P(exercises and normal blood pressure) = 45 over 100 = 9 over 20. Facilitating Reflection: PQ1. Intent: identify the outcomes. Answer: the residents are the equally likely outcomes; the categories are events, not outcomes. PQ2. Intent: Separate count from probability. Answer: the classmate gave a count, not a probability; dividing 60 by 100 gives 3 over 5. PQ3. Intent: state the modeling assumption. Answer: each resident is equally likely to be drawn. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson What We Can Now Say About Chance Put the lesson into your own words. Be ready to state how to measure the chance of an event and what the smallest and largest possible values mean. Processing Questions: 1. In your own words, how do you find the probability of an event with equally likely outcomes? 2. What does a probability of 0 mean? What does a probability of 1 mean? Can a probability be more than 1? 3. Name one situation where the formula P(E) = n(E) over n(S) would not apply. | Activity C.2. Wrapping up the Lesson Purpose: Have learners articulate the generalization, including the range from 0 to 1 and the condition of equal likelihood. Target conclusion: For an experiment with equally likely outcomes, the probability of an event is the number of favorable outcomes divided by the total number of outcomes. This value is always between 0 and 1, where 0 means impossible and 1 means certain. Eliciting prompt: Tell me, without the die, how you would measure the chance of any event. Fallback prompt: What two numbers did you compare for the die, and what did each one count? Facilitating Reflection: PQ1. Intent: articulate the rule. Answer: favorable outcomes over total outcomes. PQ2. Intent: interpret the extremes. Answer: 0 means impossible, 1 means certain, and a probability is never more than 1 because n(E) is at most n(S). |

-----

PQ3. Intent: State the boundary. Answer: any experiment without equal likelihood, such as a bent coin.

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.3. Assessing Learning Outcomes

**Purpose: Produce evidence of whether the lesson objectives have been met. No Processing Questions are used during the assessment.**

**Item alignment: Part I covers Objectives 1, 3, 4, 5, and 6. Part II covers Objectives 1, 4, 5, and 6. Part III covers Objectives 2, 3, 4, 5, and**

7.

###### Answer Key, Part I (Multiple Choice):

1. B. The even outcomes form the subset {2, 4, 6}.
2. C. The outcomes are HH, HT, TH, TT, so n(S) = 4.
3. A. BANANA has 6 letters and 3 of them are A, so P = 3/6 = 1/2.
4. B. There are 12 face cards, so P = 12/52 = 3/13.
5. A. The number of committees is C(5, 2) = 10.

###### Answer Key, Part II (Constructed Response):

1. (a) S = {(H,1), (H,2), (H,3), (H,4), (H,5), (H,6), (T,1), (T,2), (T,3), (T,4), (T,5), (T,6)}, so n(S) = 12. (b) The favorable outcomes are (H,2), (H,4), (H,6), so P = 3/12 = 1/4.
2. (a) n(S) = C(7, 3) = 35. (b) With the 2 chosen books fixed, the third comes from the remaining 5, giving C(5, 1) = 5 favorable choices, so P = 5/35 = 1/7.

###### Answer Key, Part III (True or False with Reasoning):

1. False. A probability must lie between 0 and 1, so it cannot be 1.2.
2. False. There are four outcomes, HH, HT, TH, and TT, because HT and TH are distinct.
3. True. Every event is defined as a subset of the sample space.
4. True. This is the definition of probability for equally likely outcomes, P(E) = |E| / |S|.
5. True. A probability of 0 means none of the outcomes in S are favorable to the event.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

-----

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

**Purpose: Follow up on the C.3 results. Enhancement is for learners who met the objectives; remediation is for those who did not.**

**For Enhancement: The purpose is to reason backward from a target probability to a valid experiment. Expected: any experiment meeting**

the constraints; verify that n(E) over n(S) falls between one fourth and one half.

**For Remediation: The purpose is to rebuild the listing-then-counting procedure with scaffolds.**

Answer to the task:

1. S = {1, 2, 3, 4, 5, 6}, favorable = {1, 3, 5}; P = 3 over 6 = 1 over 2.
2. S = {Red, Blue, Green, Yellow}, favorable = {Blue}; P = 1 over 4.

|  |  |  |
|---|---|---|
| III. CONTENT |  |  |
| IV. OBJECTIVES | At the end of the lesson, the learners are will be able to: 1. examine pairs of events from sample spaces to determine 2. define mutually exclusive events as events with no shared 3. determine if two or more given events are mutually exclusive 4. define the complement of an event and derive P(E') = 1 - P(E) 5. calculate the probability of the complement of an event; 6. examine the union of events using Venn diagrams to derive 7. calculate the probability of the union of two events for both | whether they share common outcomes; outcomes; in real-world contexts; by examining cases; the addition rule: P(A ∪ B) = P(A) + P(B) - P(A ∩ B); and mutually exclusive and non-mutually exclusive cases. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Can They Happen Together? In Lesson 2.1 you found the probability of one event. Now look at pairs of events. For each pair, decide whether both events can happen in a single trial. Instructions: 1. Read each pair of events. Picture one trial only: one draw, one roll, one toss, or one selection. 2. Decide whether both events can occur together in that single trial. Write YES or NO. 3. Give a short reason. If you wrote YES, name an outcome that belongs to both events. 4. Share with a partner and be ready to explain your reasoning. |  |

###### Lesson 2.2. Addition of Probabilities

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness Purpose: Surface the idea that two events may or may not share an

outcome in one trial. This intuition is the foundation for mutually exclusive events and for the addition rule built in B. No formula is computed yet.

###### Procedure for the teacher:

1. Present the pairs one at a time. Hold each to a single trial.
2. Have learners commit to YES or NO and a reason before any class discussion.
3. Ask for each pair, do these events share any outcome? Then introduce the term mutually exclusive for pairs with no shared outcome.
4. Keep the red card and king pair for last, since it is the one overlapping case.

-----

| No. | Pair of events (one trial) |  |  |
|---|---|---|---|
| 1 | Draw a heart; draw a spade |  |  |
| 2 | Roll an even number; roll an odd number |  |  |
| 3 | Pick a red ball; pick a blue ball |  |  |
| 4 | Toss a head; toss a tail |  |  |
| 5 | Select a boy; select a girl |  |  |
| 6 | Draw a red card; draw a king |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

###### Processing Questions:

1. How did you compute the probability of one event in the previous lesson?
2. Which pairs cannot happen together in a single trial, and how did you decide?
3. Which pair can happen together? Name one outcome that belongs to both events.

![](img_p71_1.png)

4. Why is it important to define each event clearly before combining them?

###### Together? Answer to the task: Reason YES/NO Togeth Pair Reason

**er?**

| 1. heart; spade | NO | Different suits. One card cannot be both. No shared outcome. |
|---|---|---|
| 2. even; odd | NO | One roll gives one number, which is even or odd, not both. |
| 3. red ball; blue ball | NO | One pick gives one ball of one color. |
| 4. head; tail | NO | One toss shows one face only. |
| 5. boy; girl | NO | One selected learner is in one category here. |
| 6. red card; king | YES | A red king (K of hearts or diamonds) is in both events. |

Pairs 1 to 5 share no outcome, so they are mutually exclusive. Pair 6 shares the red kings, so it is not. The two pictures below name the difference.

**Figure 1. Mutually Exclusive Events and Overlapping Events**

*Teacher's Technical Note. Keep this phase qualitative. Do not state* P(A or B) or the addition rule yet, and do not introduce the complement here. A.1 only establishes whether events share an outcome. The rules are derived in B.2.

###### Facilitating Reflection:

PQ1. Intent: recall the single-event definition. Answer: favorable outcomes divided by total outcomes. PQ2. Intent: justify mutual exclusivity from shared outcomes. Answer: pairs 1 to 5, because no single outcome belongs to both events.

-----

| A.2. Establishing the Purpose of the Lesson | PQ3. Intent: spot the overlapping case. Answer: pair 6; a red king belongs to both red cards and kings. PQ4. Intent: motivate precise event definitions. Answer: unclear events lead to miscounting and to the wrong rule when probabilities are combined. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Which Events Should We Combine? Each item below asks for the chance of one event or another. Your task is to find the favorable outcomes, not to apply a formula yet. Watch the word or. Instructions: 1. Read each situation. Identify the event named by the word or. 2. List the favorable outcomes, then write your best estimate of the probability. 3. Note any outcome that seems to belong to both parts of the OR. Figure 2. The Word OR Collects the Favorable Outcomes Tasks: 1. A fair die is rolled once. Find the chance of getting 2 or 4. 2. A card is drawn from a standard deck of 52. Find the chance of a heart or a spade. 3. A box holds only red and blue balls. Find the chance of a red or a blue ball. 4. A spinner shows 1 to 6. Find the chance of a number less than 3 or greater than 5. 5. A learner picks a day of the week. Find the chance of Saturday or Sunday. | Activity A.2. Appreciating Lesson Relevance Purpose: Create the need for an addition rule. Learners can collect favorable outcomes for an or event but have no rule yet for combining probabilities, especially when events overlap. That gap motivates B. Procedure for the teacher: 1. Let learners list outcomes and estimate before any rule is named. 2. Surface item 2 and item 4, where the two parts share no outcome, against the idea that some or events do share outcomes. 3. Defer the formula. Mark addition of probabilities as the tool to be built in B.2. Answer to the task: Counts and values, stated informally: 1. 2 or 4: outcomes {2, 4}, so 2/6 = 1/3 2. heart or spade: 13 + 13 = 26 of 52, so 26/52 = 1/2 3. red or blue: every ball qualifies, so the chance is 1. 4. less than 3 or greater than 5: {1, 2, 6}, so 3/6 = 1/2 5. Saturday or Sunday: 2 of 7, so 2/7 Teacher's Technical Note. All five items here happen to involve events that share no outcome, so the counts add cleanly. Do not generalize that to all or events. The overlapping case, where direct addition double counts, is the heart of B.2. Raising it now, without resolving it, is what makes the lesson feel necessary. Facilitating Reflection: PQ1. Intent: read or as at least one of the events. Answer: an outcome counts if it satisfies either part. PQ2. Intent: notice that here no outcome is shared. Answer: the favorable outcomes were the combined lists; in these items none belonged to both parts. |

![](img_p72_1.png)

-----

| B. Instituting | Processing Questions: 1. How did you read the word or in each item? 2. Which outcomes made the event true? Did any outcome belong to both parts of the or? 3. Can you always add the two chances directly? When might that go wrong? B.1. Presenting Examples | PQ3. Intent: expose the limit of direct addition. Answer: direct addition fails when the two parts share outcomes, because the shared outcomes get counted twice. |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Observe, Identify, and Add Study the examples your teacher presents. For each one, name the two events, decide whether they share an outcome, and find the chance of one event or the other. Instructions: 1. List the outcomes of each event as a set. 2. Check whether the two sets share any outcome. 3. Find the chance of A or B, and be ready to explain your steps. The single die below carries two events at once. The shared face is the key to the lesson. Figure 3. One Die Carrying Two Events That Share an Outcome Tasks: 1. A die is rolled. Find the chance of getting 1 or 4. 2. A die is rolled. Find the chance of an even number or a number greater than 4. 3. A card is drawn. Find the chance of a heart or a spade. 4. A card is drawn. Find the chance of a heart or a face card. 5. A box holds balls numbered 1 to 6. Find the chance of a prime number or an even number. | Activity B.1. Exploring Key Concepts Purpose: Let learners observe both cases side by side, events that share an outcome and events that do not, before any rule is stated. The contrast prepares the two addition rules in B.2. Procedure for the teacher: 1. Work item 1 and item 2 together so the no-overlap and overlap cases sit next to each other. 2. For each item, ask first, do these events share an outcome? Decide the case before computing. 3. Mark the shared outcomes plainly, for example the 6 in item 2 and the heart face cards in item 4. Answer to the task: 1. 1 or 4: no shared outcome (mutually exclusive). P(1 or 4) = 1/6 + 1/6 = 2/6 = 1/3 2. even {2,4,6} or greater than 4 {5,6}: shared outcome 6. P = 3/6 + 2/6 - 1/6 = 4/6 = 2/3 3. heart or spade: no shared card (mutually exclusive). P = 13/52 + 13/52 = 26/52 = 1/2 4. heart or face card: shared cards are J, Q, K of hearts (3). P = 13/52 + 12/52 - 3/52 = 22/52 = 11/26 5. prime {2,3,5} or even {2,4,6}: shared outcome 2. P = 3/6 + 3/6 - 1/6 = 5/6 Teacher's Technical Note. The two cases are not yet named with formulas here; B.2 states P(A or B) = P(A) + P(B) for the no-overlap case and P(A or B) = P(A) + P(B) - P(A and B) for the overlap case. Holding the names back keeps the focus on the shared-outcome question, which is the real decision. |

![](img_p73_1.png)

-----

| Processing Questions: 1. Which examples had events that share an outcome, and which did not? 2. What did you do differently when the events shared an outcome? 3. Why would adding the two chances directly be wrong when there is a shared outcome? | Facilitating Reflection: PQ1. Intent: sort the examples by overlap. Answer: items 2, 4, and 5 share an outcome; items 1 and 3 do not. PQ2. Intent: name the corrective step. Answer: the shared outcome was subtracted once so it was not counted twice. PQ3. Intent: explain the double count. Answer: a shared outcome sits in both events, so adding both counts it twice and inflates the chance. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Understanding How Probabilities Are Added Your teacher will state the two addition rules and the complement rule. For each task, first decide whether the events share an outcome, then choose the matching rule. The rules: • No shared outcome (mutually exclusive): P(A or B) = P(A) + P(B). • Shared outcome (not mutually exclusive): P(A or B) = P(A) + P(B) - P(A and B). • Complement of E (everything not in E): P(E') = 1 - P(E). Tasks: 1. A die is rolled. Find the chance of getting 1 or 6. 2. A die is rolled. Find the chance of an even number or a number greater than 4. 3. A card is drawn. Find the chance of a heart or a face card. 4. A die is rolled. Find the chance of an even number, then the chance of a number that is not even. 5. If the chance of rain today is 0.30, find the chance of no rain. Processing Questions: 1. What makes two events not mutually exclusive? 2. Why is the shared outcome subtracted exactly once? | Activity B.2. Deepening Conceptual Understanding Purpose: State and justify the addition rule for both cases and the complement rule, so learners choose the correct rule from the structure of the events. This phase carries Objectives 4 to 7. Mutually exclusive case: When two events share no outcome, the favorable outcomes simply combine, so P(A or B) = P(A) + P(B). Example: even {2,4,6} or odd {1,3,5} on a die. They share nothing, so P = 3/6 + 3/6 = 1, a certain event. Non-mutually exclusive case: When two events share outcomes, adding P(A) and P(B) counts the shared part twice. Subtract it once: P(A or B) = P(A) + P(B) - P(A and B). Figure 4. Why the Shared Region Is Subtracted Once Example: heart or face card. Hearts are 13, face cards are 12, and 3 cards are both, namely J, Q, K of hearts. P = 13/52 + 12/52 - 3/52 = 22/52 = 11/26 |

![](img_p74_1.png)

-----

![](img_p75_1.png)

3. How are an event and its complement related, and why do their chances add to 1?

**Figure 5. Heart or Face Card in a 52-Card Deck Complement of an event: The complement E' is every outcome not**

in E. An event and its complement share no outcome and together fill the sample space, so they are mutually exclusive and exhaustive. By the first rule,

P(E) + P(E') = 1, so P(E') = 1 - P(E).

![](img_p75_2.png)

**Figure 6. An Event and Its Complement Partition the Sample Space**

Example: P(even) = 3/6, so P(not even) = 1 - 3/6 = 3/6. If P(rain) = 0.30, then P(no rain) = 1 - 0.30 = 0.70.

###### Choosing the rule: Relationship of the events Rule to use

Share no outcome P(A or B) = P(A) + P(B) Share one or more outcomes P(A or B) = P(A) + P(B) - P(A and B) An event and its complement P(E') = 1 - P(E)

-----

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

**Purpose: Move learners to independently use of the two rules, with the overlap decision as the first step every time. Procedure for the teacher:**

1. Work item 1 with the class, then release the rest for individual or pair work.
2. Circulate and ask, do these events share an outcome, before checking the arithmetic.
3. Collect a few solutions to display both a mutually exclusive and an overlapping case.

###### Answer to the task:

1. 3 or 6 (mutually exclusive): 1/6 + 1/6 = 1/3
2. even {2,4,6} or less than 4 {1,2,3}, shared {2}: 3/6 + 3/6 - 1/6 = 5/6
3. heart or spade (mutually exclusive): 26/52 = 1/2
4. heart or face card, shared 3: 22/52 = 11/26
5. prime {2,3,5} or even {2,4,6}, shared {2}: 3/6 + 3/6 - 1/6 = 5/6 *Teacher's Technical Note. Items 2 and 5 give the same value through different shared outcomes. This is a useful coincidence to point out,* but it is not a rule. Each item still requires its own overlap check.

###### Answer to the task:

1. 1 or 6: 1/6 + 1/6 = 2/6 = 1/3
2. even or greater than 4: 3/6 + 2/6 - 1/6 = 2/3
3. heart or face card: 22/52 = 11/26
4. even = 3/6; not even = 1 - 3/6 = 3/6 = 1/2
5. no rain = 1 - 0.30 = 0.70.

*Teacher's Technical Note. The complement rule is a special case of* the mutually exclusive rule, not a new idea: E and E' are mutually exclusive and exhaustive, so their probabilities sum to 1. Deriving it this way, rather than asserting it, keeps the lesson coherent. The general three-set inclusion and exclusion rule is beyond this lesson and is not required.

|  | Facilitating Reflection: PQ1. Intent: define non-mutual exclusivity. Answer: the events share at least one outcome. PQ2. Intent: justify the single subtraction. Answer: the shared outcome was counted in both P(A) and P(B), so it is removed once to count it a single time. PQ3. Intent: connect complement to the addition rule. Answer: E and E' are mutually exclusive and fill the sample space, so P(E) + P(E') = 1. |
|---|---|
| Activity B.3. Practicing | Learned Skills |

-----

| C. | Facilitating PQ1. Answer: PQ2. Answer: PQ3. C.1. | Reflection: Intent: Foreground the overlap by checking first whether the Intent: name the overlap clue. an outcome that satisfies both Intent: list the common errors. Finding Practical Application | decision. events share an event descriptions, | outcome, then such as 2 | choosing the matching rule. being even and less than 4. |
|---|---|---|---|---|---|
| Demonstrating Knowledge and Skills | Probability Apply the 1. 2. 3. No. 1 2 3 4 5 Processing 1. probability 2. 3. | Activity C.1. Making in Real-Life Situations the addition rules to everyday case, choose the rule, and compute. Instructions: Identify the two events in each Decide whether they share an outcome, Compute and interpret the result. Real-life situation A random day is chosen: Saturday or Sunday A die is rolled: getting 1 or 2 A card is drawn: red card or black card A box of apples and oranges: apple or orange A spinner 1 to 5: odd number or greater than 3 Questions: Which situations covered the whole of 1? Where did a shared outcome appear, How can the addition rule support | Real-World Connections situations. For each Show full solutions situation. then choose the Type (mutually exclusive / not) sample space, giving and how did you an everyday decision? | item, decide on paper. rule. P(A or B) a handle it? | Activity C.1. Making Real-World Connections Purpose: Transfer the rules to real contexts, including two cases that cover the whole sample space, which connect back to the complement. Procedure for the teacher: 1. Let learners classify each situation before computing. 2. Use items 3 and 4 to revisit the complement: the two events fill the sample space, so the chance is 1. 3. Ask learners to state the result in plain words. Answer to the task: 1. Saturday or Sunday (mutually exclusive): 1/7 + 1/7 = 2/7 2. 1 or 2 (mutually exclusive): 1/6 + 1/6 = 1/3 3. red or black: covers the deck, so the chance is 1. 4. apple or orange: covers the box, so the chance is 1. 5. odd {1,3,5} or greater than 3 {4,5}, shared {5}: 3/5 + 2/5 - 1/5 = 4/5 Teacher's Technical Note. Items 3 and 4 are complement pairs: black is the complement of red, orange is the complement of apple. Each pair is mutually exclusive and exhaustive, so the union has probability 1. This links C.1 back to the complement rule from B.2 without introducing anything new. Facilitating Reflection: PQ1. Intent: connect exhaustive pairs to a probability of 1. Answer: items 3 and 4, where the two events together cover every outcome. PQ2. Intent: locate the overlap. Answer: item 5, where 5 is both odd and greater than 3, so it is subtracted once. |

-----

| C.2. Making Generalization | PQ3. Intent: see the rule as a decision aid. Answer: it gives the chance that at least one of several wanted outcomes occurs. |
|---|---|
| Activity C.2. Wrapping up the Lesson Summarize the Rule Complete each statement in your own words, then check it against the examples from the lesson. Complete the statements: 1. Two events are mutually exclusive if they ____________. 2. Two events are not mutually exclusive if they ____________. 3. For mutually exclusive events, P(A or B) = ____________. 4. For events that share an outcome, P(A or B) = ____________. 5. For an event E and its complement, P(E') = ____________. Use the flow below to decide which addition rule fits a problem. Figure 7. Choosing the Addition Rule from the Overlap Processing Questions: 1. When can probabilities be added directly? 2. How does a shared outcome change the calculation? 3. Why will this lesson matter for later probability topics? | Activity C.2. Wrapping up the Lesson Purpose: Consolidate the lesson into precise statements and a single decision path, so learners can select the right rule without a worked example in front of them. Procedure for the teacher: 1. Have learners complete the statements individually, then refine the wording together. 2. Walk the decision flow once with a fresh example. Answer to the task: 1. have no shared outcome (cannot occur together in one trial). 2. share at least one outcome (can occur together). 3. P(A) + P(B). 4. P(A) + P(B) - P(A and B). 5. 1 - P(E). Teacher's Technical Note. The flowchart is a summary aid, not a new method. The single decision, do the events share an outcome, governs the whole lesson, and the complement rule is the exhaustive special case of the first branch. Facilitating Reflection: PQ1. Intent: state the no-overlap condition. Answer: when the events are mutually exclusive, with no shared outcome. PQ2. Intent: state the corrective step. Answer: a shared outcome is subtracted once to avoid double counting. PQ3. Intent: look ahead. Answer: conditional probability and Bayes' Rule in later lessons rely on identifying events, intersections, and complements. |

![](img_p78_1.png)

-----

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.3. Assessing Learning Outcomes

**Purpose: Measure attainment of the lesson objectives on mutually exclusive events, the complement, and the addition rule for overlapping**

and non-overlapping cases.

**Item alignment: Part I covers Objectives 2, 3, 4, 5, 6, and 7. Part II covers Objectives 1, 3, 6, and 7. Part III covers Objectives 1, 2, 4, 6,**

and 7.

###### Answer Key, Part I (Multiple Choice):

1. A. Mutually exclusive events share no outcomes.
2. B. The events are mutually exclusive, so P = 1/6 + 1/6 = 2/6 = 1/3.
3. A. P(complement) = 1 - 0.3 = 0.7.
4. B. Hearts number 13, face cards 12, and 3 cards are both, so P = (13 + 12 - 3)/52 = 22/52 = 11/26.
5. C. The events are mutually exclusive, so P = 0.5 + 0.4 = 0.9.

###### Answer Key, Part II (Constructed Response):

1. P(basketball or volleyball) = 0.5 + 0.3 - 0.1 = 0.7.
2. (a) Multiples of 3 number 6, multiples of 5 number 4, and 15 is both, so P = (6 + 4 - 1)/20 = 9/20. (b) Not mutually exclusive, because 15 is a multiple of both 3 and 5, so the events share an outcome.

###### Answer Key, Part III (True or False with Reasoning):

1. True. With no shared outcomes there is nothing to subtract, so the probabilities add directly.
2. False. When the events overlap, the shared outcomes are counted twice, so P(A and B) must be subtracted once.
3. True. An event and its complement cover the whole sample space without overlap, so their probabilities sum to 1.
4. True. If they were mutually exclusive, P(A) + P(B) = 1.3, which exceeds 1, so they must overlap.
5. False. Every heart is a red card, so the events overlap and can occur together.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

| Rubric for constructed response (Part II): |
|---|
| Score Anchor |
| 5 Correct method, correct answer, and a clear interpretation where the item asks for one. |
| 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. |
| 1 Names the right rule or sets a numerator but does not reach a usable answer. |
| 0 No relevant setup. |

-----

| C.4. Additional Activities (Complete instructions for learners are | on the Learning Activity Sheet.) |
|---|---|
| Activity C.4. Extending | and Reinforcing Learning |

**Purpose: Extend the rules to a survey context like the unit Performance Task, give a concrete remedial path for learners who need it, and**

let stronger learners create and justify their own problems.

|  | Procedure for the teacher: 1. Assign the enhancement task to all; use the survey Venn to show 2. For the remedial group, run the hoops activity and count the union 3. Check learner-created problems for a clear event definition, a correct Answer to the task: Survey: P(Math or English) = 18/40 + 15/40 - 7/40 = 26/40 = 13/20 The 7 students who like both are inside both counts, so they are like only English, for 26 who like at least one. Create your own: answers vary. A correct response defines the events, computes correctly. Sample: a die roll, P(2 or 5) = 2/6 = 1/3, mutually Teacher's Technical Note. The survey context is the same family as Part that a student passed or studies regularly. Treat this as preparation Facilitating Reflection: PQ1. Intent: explain the subtraction in context. Answer: the 7 who like both are counted in the 18 and again in the 15, PQ2. Intent: check learner-made overlap. | the parts. by hand before naming the rule. overlap decision, and correct computation. subtracted once. By count, 11 like only Mathematics, 7 like both, and 8 marks any shared outcome, selects the matching rule, and exclusive. B of the unit Performance Task, where learners compute the chance for that task, not as the task itself. so they must be removed once. |
|---|---|---|
| III. CONTENT | Lesson 2.3. | Independent Events |
| IV. OBJECTIVES | By the end of the lesson, the learners are expected to: 1. define independent events through cases where P(A \| B) = independent events; and 2. determine whether two events are independent using | P(A); state the multiplication rule P(A ∩ B) = P(A) · P(B) for probability calculations. |
| V. PROCEDURES | LEARNERS ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learner Readiness Does One Affect the Other? In Lesson 2.2 you combined events with or. Now look at two events that happen one after another. For each pair, decide whether the first event changes the chance of the second. | Activity A.1. Leveling Learner Readiness Purpose: Surface the intuition of effect and no effect between two events in sequence. This prepares the formal idea of independent events and the multiplication rule in B. No formula is used yet. |

-----

###### Instructions:

1. Read each pair. Picture the first event happening, then the second.
2. Decide whether the first event changes the chance of the second. Write YES if it does or NO if it does not.
3. Give a short reason. Think about whether anything is removed or replaced.
4. Discuss with a partner and be ready to explain.

###### No Pair of events (one after

###### . another)

| 1 | Toss a coin: head first, then head again |
|---|---|
| 2 | Draw a card, replace it, then draw again |
| 3 | Pick a student, then pick another (not replaced) |
| 4 | Roll a die, then roll it again |
| 5 | Rain today, then rain tomorrow |
| Processing | Questions: |

1. How do you find the probability of a single event?
2. Which pairs left the second chance unchanged, and how did you decide?

![](img_p81_1.png)

3. Can two events occur one after another without affecting each other? Give an example.
4. Why check the relationship between events before computing a probability?

###### Procedure for the teacher:

1. Present each pair. Ask whether anything is removed or replaced between the two events.
2. Let learners commit to YES or NO with a reason before discussion.
3. Hold back the term independent. Accept phrases like does not change the chance or makes fewer outcomes.

###### Answer to the task: Affects the Pair other? Reason

**YES/NO** 1. coin, head then

head

2. card, replace, draw
3. student, not replaced
4. die, then die
5. rain today, tomorrow Pairs 1, 2, and 4 leave the second chance unchanged. Pairs 3 and 5 change it. The difference is whether the setup is altered, which the picture below makes concrete with cards.

###### Affects Reason ?

| NO | Each toss has the same outcomes; the first does not change the second. |
|---|---|
| NO | Replacing restores the 52-card deck, so the second chance is unchanged. |
| YES | One fewer student remains, so the second chance changes. |
| NO | Each roll has the same six outcomes; rolls do not affect each other. |
| YES | Weather is linked; today can change the chance of rain tomorrow. |

**Figure 1. When the Second Chance Stays the Same and When It**

*Changes*

-----

*Teacher's Technical Note. Keep this phase qualitative. Do not name* independent events or state the multiplication rule yet; both are introduced in B.2. Pair 5 is a real-world dependence that cannot be computed from a sample space here, so use it only to show that effects exist, not to compute.

###### Facilitating Reflection:

PQ1. Intent: recall single-event probability. Answer: favorable outcomes divided by total outcomes. PQ2. Intent: link no effect to an unchanged setup. Answer: pairs 1, 2, and 4, where nothing is removed and the outcomes stay the same. PQ3. Intent: assert that sequence does not force dependence. Answer: yes; two coin tosses occur in sequence but do not affect each other. PQ4. Intent: motivate checking the relationship. Answer: the rule used depends on whether the first event changes the second.

###### A.2. Establishing the Purpose of the Lesson

**Activity A.2. Appreciating Lesson Relevance Activity A.2. Appreciating Lesson Relevance**

**Does the Chance Change? Purpose: Create the need to classify events. When the second**

For each situation, focus on the second event. Decide whether its chance does not change, the events behave one way; when it probability changes once the first event has happened. changes, they behave another. That distinction motivates the

definition and rule in B.

###### Instructions: Procedure for the teacher:

1. Name the first event and the second event.
            1. Keep the focus on the second event only.
2. Decide whether the chance of the second event changes. Write CHANGES or DOES NOT CHANGE. 2. Tie each answer to whether something was removed or replaced.
3. Give a short reason, noting what was removed or replaced. 3. Defer the formula. Mark independent events as the idea to be built in B.2.

###### Second chance: Answer to the task:

###### CHANGES /

**No. Situation Reason Second**

**DOES NOT Situation Reason**

###### CHANGE chance

1. coin twice does not Each toss keeps the same two 1 Toss a fair coin twice change outcomes. 2 Draw a card, replace it,
2. card, replace does not Replacing restores the deck to draw again change 52. 3 Draw a card, do not
3. card, no changes One fewer card remains, so the replace, draw again replace chance shifts. 4 Roll two fair dice, one
4. two dice does not Each roll keeps the same six after the other change outcomes.

-----

5 Pick two marbles 5. marbles, no changes The bag has fewer marbles for

without replacement replace the second pick.

###### Processing Questions:

1. What did you notice about the second event compared with the first?
2. What caused the chance to change in some situations?
3. Why is it useful to know whether the chance changes before computing?

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts Observe and Decide

Study the examples your teacher presents. For each one, find the chance of the second event before and after the first event happens, and compare.

###### Instructions:

1. Name Event A and Event B in each example.
2. Write the chance of Event B, then check whether Event A changed it.
3. Record your observation and be ready to explain. A tree shows why two stages of chance multiply. Each branch carries its own probability, and a full path multiplies them.

*Teacher's Technical Note. The two cases divide cleanly by* replacement. Situations 1, 2, and 4 keep the sample space; situations 3 and 5 shrink it. Name the two behaviors only in B.2, as independent and dependent.

###### Facilitating Reflection:

PQ1. Intent: compare second to first. Answer: in some, the second event keeps the same outcomes; in others, the outcomes become fewer. PQ2. Intent: locate the cause. Answer: removing something without replacing it changed the chance. PQ3. Intent: motivate the classification. Answer: it decides whether the second probability must be adjusted before multiplying.

###### Activity B.1. Exploring Key Concepts

**Purpose: Let learners observe that in each example the chance of**

the second event does not change, before the term independent is introduced. The tree links this to multiplying along a path.

###### Procedure for the teacher:

1. Write the chance of Event B before and after Event A for each example.
2. Point out that the two values are equal in all three examples.
3. Use the tree to show that each path probability is the product of its branches.

###### Answer to the task:

1. coin: P(head) = 1/2 on both tosses; unchanged.
2. card with replacement: P(heart) = 13/52 on both draws; unchanged.
3. die: P(6) = 1/6 on both rolls; unchanged. *Teacher's Technical Note. These are no-effect cases by design. The* contrast case, drawing without replacement, where the second

-----

![](img_p84_1.png)

| Figure 2. Tossing a Coin Twice as a Two-Stage Tree Examples: 1. Toss a coin twice. A: head on the first toss. B: head on the second toss. 2. Draw a card, replace it, draw again. A: a heart first. B: a heart second. 3. Roll a die twice. A: a 6 on the first roll. B: a 6 on the second roll. Processing Questions: 1. In each example, did the chance of Event B change after Event A? 2. What do these examples have in common? 3. How is each leaf probability in the tree related to the branch probabilities? | Answer: each leaf probability is the product of the branch |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Understanding Independent Events Your teacher will define independent events and state the multiplication rule. Use the rule only after you confirm the events do not affect each other. The rule: • Two events are independent when one does not change the chance of the other. | Activity B.2. Deepening Conceptual Understanding multiplication rule, and give the equivalent conditional check P(A given B) = P(A). This phase carries Objectives 1 and 2. Definition: Two events A and B are independent when the Multiplication rule: For independent events, P(A and B) = P(A) x P(B). |

chance changes, is introduced in B.2 so the definition can name both. The tree previews the multiplication rule without yet stating it.

###### Facilitating Reflection:

PQ1. Intent: confirm the unchanged second chance. Answer: no; in all three, the chance of Event B stayed the same. PQ2. Intent: name the common feature. Answer: nothing was removed, so the sample space was the same for both events. PQ3. Intent: connect leaves to branches. probabilities along its path, for example 1/2 times 1/2.

**Purpose: Define independent events, state and justify the**

occurrence of one does not change the probability of the other.

-----

- For independent events: P(A and B) = P(A) x P(B). Example: a coin twice. P(head) = 1/2 each toss, so P(two heads) =
- Check: P(A given B) = P(A) means knowing B does not change 1/2 x 1/2 = 1/4. The area model shows the product as a region. the chance of A.

![](img_p85_1.png)

###### Tasks:

1. Toss a coin twice. Find the chance of two heads.
2. Roll a die twice. Find the chance of a 6 then a 3.
3. Draw a card, replace it, draw again. Find the chance of two hearts.
4. Draw two cards without replacement. Find the chance of two hearts, and say whether the events are independent.

###### Processing Questions:

1. Why do we multiply the probabilities for independent events? **Figure 3. The Multiplication Rule as an Area**
2. How does the rule connect to the word and?
3. What changes when the events are dependent? Example: a die twice. P(6) = 1/6 and P(3) = 1/6, so P(6 then 3) = 1/6 x 1/6 = 1/36. One cell in the grid of 36 equally likely pairs.

![](img_p85_2.png)

**Figure 4. Two Dice: One Cell out of 36**

**A second way to check independence: Independence can also be**

written as P(A given B) = P(A): once we know B happened, the chance of A is unchanged. Conditional probability is developed fully in Lesson 2.4; here read P(A given B) as the chance of A among the cases where B occurred. The table below shows an independent case.

-----

**Pass Fail Total**

| Study | 30 | 30 | 60 |
|---|---|---|---|
| Not study | 20 | 20 | 40 |
| Total | 50 | 50 | 100 |

P(pass) = 50/100 = 1/2; P(pass given study) = 30/60 = 1/2. Equal, so the events are independent.

**Dependent events for contrast: When the first event changes the**

setup, the second chance changes, and the events are dependent. Two cards without replacement: P(two hearts) = 13/52 x 12/51 = 1/17 (the second chance is 12/51, not 13/52).

###### Choosing the rule:

###### Relationship of the events What to do

Independent (no change in the Multiply directly: P(A) x P(B) chance) Dependent (the chance changes) Adjust the second chance,

then multiply

###### Answer to the task:

1. two heads: 1/2 x 1/2 = 1/4
2. 6 then 3: 1/6 x 1/6 = 1/36
3. two hearts, replaced: 13/52 x 13/52 = 1/16
4. two hearts, not replaced (dependent): 13/52 x 12/51 = 1/17 *Teacher's Technical Note. The conditional form P(A given B) = P(A) is* the formal definition of independence and is exactly what Part C of the unit Performance Task asks learners to check. Full conditional probability, including P(B given A) for the general multiplication rule used in the dependent case, is the subject of Lesson 2.4. Here the dependent computation is read directly from the reduced deck, 12 of 51, without that machinery.

###### Facilitating Reflection:

PQ1. Intent: justify multiplication. Answer: each independent stage keeps its own chance, so the combined chance is their product.

-----

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

**Purpose: Move learners to independent practice, with the independence check as the first step before any multiplication. Procedure for the teacher:**

1. Work item 1 with the class, then release the rest.
2. Ask first, is the second chance unchanged, before checking arithmetic.
3. Use item 4 to show the dependent adjustment.

|  | PQ2. Intent: connect to and. Answer: P(A and B) asks for both to occur, and for independent events that is the product of the two chances. PQ3. Intent: contrast with dependence. Answer: the second chance must be adjusted because the first event changed the setup. |
|---|---|
| Activity B.3. Practicing | Learned Skills |

###### Answer to the task:

1. independent: 1/2 x 1/2 = 1/4
2. independent: 1/6 x 1/6 = 1/36
3. independent: 13/52 x 13/52 = 1/16
4. dependent: 13/52 x 12/51 = 1/17
5. independent: 5/8 x 5/8 = 25/64 *Teacher's Technical Note. Items 3 and 5 are independent because of replacement. Item 4 is the only dependent case, with the second* chance reduced to 12/51. Replacement is the practical signal, but the real test is whether the second chance changes.

|  | Facilitating Reflection: PQ1. Intent: foreground the independence check. Answer: by asking whether the second chance is unchanged, which PQ2. Intent: name the procedure. Answer: find each chance, adjust the second if dependent, then PQ3. Intent: list the common errors. Answer: multiplying without checking, forgetting to reduce the second | it is except in item 4. multiply. chance in the no-replacement case, or simplifying incorrectly. |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.. Making Real-World Connections Independent or Not in Real Life? Apply the idea of independence to everyday situations. For each one, classify the events, then compute the chance that both occur. | Activity C.1. Making Real-World Connections Purpose: Transfer the rule to practical contexts and contrast independent cases with a dependent one, the without-replacement draw. |

-----

###### Instructions:

1. Name Event A and Event B.
2. Decide independent or dependent, and justify using the chance of the second event.
3. Compute the chance that both occur. Guessing two questions is a chance experiment with two independent stages, shown as a tree.

###### Procedure for the teacher:

1. Have learners classify before computing.
2. Use situation 3 against situation 4 to show how replacement changes the second chance.
3. Ask learners to state each result in plain words.

###### Answer to the task:

![](img_p88_1.png)

1. two guesses (independent): 1/4 x 1/4 = 1/16
2. two heads (independent): 1/2 x 1/2 = 1/4
3. both red, no replacement (dependent): 3/5 x 2/4 = 3/10
4. both red, with replacement (independent): 3/5 x 3/5 = 9/25
5. two 4s (independent): 1/6 x 1/6 = 1/36 *Teacher's Technical Note. Situations 3 and 4 use the same box and* differ only by replacement, which is the clearest way to show dependence against independence. The without-replacement second chance, 2/4, is read directly from the reduced box.

**Figure 6. Guessing Two Multiple-Choice Questions**

###### Situations:

1. A learner guesses two four-option questions. Find the chance both are correct.
2. A fair coin is tossed twice in a game. Find the chance of two heads.
3. From a box of 3 red and 2 blue balls, two are drawn without replacement. Find the chance both are red.
4. From the same box, two are drawn with replacement. Find the chance both are red.
5. A die is rolled to set a prize, then rolled again. Find the chance of a 4 on both rolls.

###### Facilitating Reflection:

PQ1. Intent: sort the situations. Answer: 1, 2, 4, and 5 are independent; 3 is dependent. PQ2. Intent: warn against false independence. Answer: when something is removed and not replaced, so the second chance has actually changed. PQ3. Intent: see the value of the idea. Answer: it selects the correct rule and avoids miscounting repeated chances.

###### Processing Questions:

1. Which situations were independent, and which were dependent?
2. When might assuming independence lead to a wrong answer?
3. How does knowing about independence help a decision?

-----

| C.2. Making Generalization |  |
|---|---|
| Activity C.2. Wrapping up the Lesson Complete the Idea Complete each statement in your own words, based on the lesson. 1. Two events are independent if ____________. 2. The chance of one event changes when the events are ____________. 3. For independent events, the chance that both occur is found by ____________. 4. Replacement in an experiment usually makes the events ____________. 5. Independence can be checked by comparing P(A given B) with ____________. Use the flow below to decide whether to multiply directly. In the figure, A ∩ B means A and B. Figure 7. Deciding Independent or Dependent Processing Questions: 1. When should the multiplication rule be used? 2. How does this lesson differ from the addition of probabilities? 3. Why will independence matter in later probability topics? | Activity C.2. Wrapping up the Lesson Purpose: Consolidate the lesson into precise statements and a single decision path for choosing whether to multiply directly. Procedure for the teacher: 1. Have learners complete the statements, then refine the wording together. 2. Walk the decision flow with one fresh example. Answer to the task: 1. the occurrence of one does not change the probability of the other. 2. dependent. 3. multiplying the chance of each event, P(A) x P(B). 4. independent. 5. P(A); if they are equal, the events are independent. Teacher's Technical Note. The flow is a summary aid. The single decision, does knowing the first event happened change the probability of the second, governs the lesson, and the conditional check P(A given B) = P(A) is its formal statement, developed further in Lesson 2.4. Facilitating Reflection: PQ1. Intent: state the rule's condition. Answer: when finding the chance that two independent events both occur. PQ2. Intent: contrast with Lesson 2.2. Answer: addition handles or for combining outcomes; multiplication handles and for events occurring together. PQ3. Intent: look ahead. Answer: conditional probability and Bayes' Rule depend on telling independent from dependent events. |

![](img_p89_1.png)

-----

| C.3. | Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.) |
|---|---|
|  | Activity C.3. Assessing Learning Outcomes |

**Purpose: Measure attainment of the objectives on distinguishing independent from dependent events and applying the multiplication**

rule.

**Item alignment: Part I covers Objectives 1 and 2. Part II covers Objectives 1 and 2. Part III covers Objectives 1 and 2.**

###### Answer Key, Part I (Multiple Choice):

1. A. Independence means the condition does not change the probability, that is P(A | B) = P(A).
2. B. For independent events, P(A and B) = P(A) · P(B).
3. B. Tossing a coin twice is independent; the other choices are without-replacement or sequential selections that change the second probability.
4. C. P(two heads) = 1/2 · 1/2 = 1/4.
5. B. P(a 6 and a head) = 1/6 · 1/2 = 1/12.

###### Answer Key, Part II (Constructed Response):

1. (a) Independent, since the coin and the die do not affect each other. (b) P(a number greater than 4) = 2/6 = 1/3, so P(tails and greater than 4) = 1/2 · 1/3 = 1/6.
2. (a) The King of hearts is the only card that is both, so P(A and B) = 1/52. (b) P(A) = 4/52 = 1/13 and P(B) = 13/52 = 1/4, so P(A) · P(B) = 1/13 · 1/4 = 1/52. Since P(A and B) = P(A) · P(B), the events are independent.

###### Answer Key, Part III (True or False with Reasoning):

1. True. This is the multiplication rule for independent events.
2. False. Mutually exclusive events cannot occur together, so P(A and B) = 0, while independent events with positive probability have P(A and B) = P(A) · P(B), which is more than 0.
3. False. Removing the first card changes the makeup of the deck, so the second draw depends on the first.
4. False. The two tosses are independent, so the first result does not change the second.
5. True. P(A and B) = 0.5 · 0.2 = 0.1 by the multiplication rule.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II):

| Score | Anchor |
|---|---|
| 5 | Correct method, correct answer, and a clear interpretation where the item asks for one. |
| 3 | Correct setup with one arithmetic slip, or a correct value without the requested interpretation. |
| 1 | Names the right rule or sets a numerator but does not reach a usable answer. |
| 0 | No relevant setup. |

-----

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

**Purpose: Give a guided remedial path for learners who need it and an open enrichment task for those ready to create and justify their**

own situations.

###### Procedure for the teacher:

1. Assign the remedial tasks to learners who struggled in C.3; guide with the questions, was anything replaced, did the count change.
2. For enrichment, check the created situation for a clear event definition, a correct type decision, and correct computation.

###### Answer to the task:

1. coin three times (independent): P(three heads) = 1/2 x 1/2 x 1/2 = 1/8
2. with replacement (independent): P(two red) = 3/5 x 3/5 = 9/25
3. without replacement (dependent): P(two red) = 3/5 x 2/4 = 3/10 Enrichment: answers vary. A correct response defines both events, decides the type from whether the second chance changes, and computes correctly. Sample: two coin tosses, P(two tails) = 1/2 x 1/2 = 1/4, independent. *Teacher's Technical Note. Tasks 2 and 3 use the same box and differ only by replacement, so learners can see the dependence appear in* the second factor, 3/5 against 2/4.

|  | Facilitating Reflection: PQ1. Intent: locate the dependence. Answer: task 3, because a ball was removed and not replaced, lowering PQ2. Intent: check learner reasoning. Answer: varies; the type must follow from whether the second chance The created situations surface the reasoning scored in Part 2, item 25, of | the second chance to 2/4. changes. the unit Summative Assessment. |
|---|---|---|
| III. CONTENT | Lesson 2.4. Conditional | Probability |
| IV. OBJECTIVES | At the end of this lesson, the learners are able to: 1. examine examples in which knowing one event has occurred changes 2. distinguish simple probability from conditional probability based on 3. define conditional probability P(A \| B) and derive the formula P(A \| 4. calculate conditional probabilities in real-world contexts. | the probability of another event; whether prior information is given; B) = P(A ∩ B) / P(B) from sample-space restriction; and |
| V. PROCEDURES | LEARNERS ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness What Was the Denominator? Instructions: Work with a partner. Answer each item on your own first, then compare answers before the class discussion. | Activity A.1. Leveling Learners Readiness Purpose: Recall that the probability of an event equals the |

number of favorable outcomes over the size of the whole sample space, and recall how to read a two-way table. This surfaces the denominator as the whole sample space, which the lesson will later restrict. The formula being recalled is shown below.

-----

![](img_p92_1.png)

###### Part I. The number wheel

A game wheel is divided into eight equal sections numbered 1 to 8. You spin it once, and each section is equally likely.

1. List all the possible results in one spin.
2. Find the probability that the result is an even number.
3. Find the probability that the result is a number greater than 5.

###### Part II. Reading a two-way table

The table below shows 40 Grade 11 learners grouped by sex and by whether they joined a school club. Use it to answer the items.

| Learner |  |  |  |
|---|---|---|---|
| Male |  |  |  |
| Female |  |  |  |
| Total |  |  |  |

1. How many learners were surveyed in all?
2. Find the probability that a learner chosen at random joined a club.
3. Find the probability that a learner chosen at random is female.

###### Joined

12 8

**20**

*Joined or did not join a school club, by sex.*

###### Processing Questions:

1. In each item, what number did you place in the denominator, and why that number?

![](img_p92_2.png)

2. When you found the probability of choosing a female learner, did you count from all 40 learners or only from part of them?
3. Suppose you were told first that the chosen learner is male. From how many learners would you now be choosing?

**Strategy: Think-Pair-Share. Learners answer alone, compare**

with a partner, then share with the class. This exposes different denominators learners used.

###### Procedure for the teacher:

1. Give five minutes for independent work, then three minutes for pair comparison.
2. Call on pairs to report the denominator they used in each

| Did not | Total | item and write these on the board. |
|---|---|---|
| 6 | 18 | 3. Use the prompts below to push toward the idea of a |
| 14 20 | 22 40 | restricted denominator. Do not define conditional probability yet. |

###### Answer to the task:

Part I. The sample space is {1, 2, 3, 4, 5, 6, 7, 8}, so n(S) = 8. Even numbers are {2, 4, 6, 8}, so P(even) = 4/8 = 1/2. Numbers greater than 5 are {6, 7, 8}, so P(greater than 5) = 3/8. Part II. The survey covered 40 learners. P(joined) = 20/40 = 1/2. P(female) = 22/40 = 11/20.

-----

| A.2. Establishing the Purpose of the Lesson | Figure 1. How to read a two-way table. Facilitating Reflection: PQ1 checks that learners can name the denominator. Expected: the denominator is the size of the whole group being chosen from, which is 8 in Part I and 40 in Part II. PQ2 confirms that simple probability counts from the entire sample space. Expected: all 40 learners were used, not a part. PQ3 is the bridge to the lesson. Expected: only the 18 male learners remain, so the denominator would change from 40 to 18. Accept this as a hint and hold the full computation for later. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Who Passed the Barangay Scholarship Screening? Instructions: Read the situation and study the table. Answer the short questions. You do not need a formula yet; reason from the table. A barangay offered a scholarship and screened 100 applicants with an examination. The barangay also recorded whether each applicant attended the free review session. The results are shown below. Figure 2. Screening results, with the row for applicants who attended the review highlighted. | Activity A.2. Appreciating Lesson Relevance Purpose: Show a real decision in which the group of interest is not the whole sample space but a smaller, known group. This motivates the need for a probability that uses a restricted denominator. Strategy: Guided situation analysis. Lead a short whole-class reading of the table. Keep the focus on which row answers each question. Procedure for the teacher: 1. Project the table and confirm the totals with the class: 53 passed out of 100. 2. For item 2, direct learners to the highlighted row for applicants who attended the review. 3. Name the gap without giving the formula: there is no agreed term or method yet for a probability computed within one row. Answer to the task: PQ1: 53 applicants passed out of 100. This uses the whole sample space. PQ2: read the highlighted row for applicants who attended the review. In that row, 39 of 60 passed. PQ3: item 2 looks only at applicants who attended the review, so the group being counted from is 60, not 100. The denominator changes once we are told something in advance. |

-----

###### Processing Questions:

1. Across all 100 applicants, how many passed?
2. The barangay captain says, "Among those who attended the review, how many passed?" Which row do you read to answer this?
3. Why is the question in item 2 different from simply asking how many applicants passed in all?

| B. Instituting | B.1. Presenting Examples |  |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Same Question, Different Group Instructions: In each situation you will answer the same question twice. First answer it for the whole group. Then answer it for a smaller group that you are told about in advance. Situation 1. Drawing a card A standard deck has 52 cards. Of these, 26 are red, and 13 of the red cards are hearts. 1. Find the probability that a card drawn from the full deck is a heart. 2. Now suppose you are told the card is red. Find the probability that it is a heart, given this. Situation 2. Rolling a die A fair die is rolled once. 1. Find the probability that the result is greater than 3. 2. Now suppose you are told the result is even. Find the probability that it is greater than 3, given this. Figure 3. Being told something in advance shrinks the sample space. |  |

###### Facilitating Reflection:

Use PQ3 to state the lesson goal: today the class will name and compute the probability of an event within a known, smaller group. *Teacher's Technical Note: Avoid writing the term conditional* probability on the board until B.2. Here the aim is only to feel the shift in the denominator.

###### Activity B.1. Exploring Key Concepts Purpose: Introduce conditional reasoning through paired

examples that keep the event fixed and vary only the given condition. Holding one part constant while changing another helps learners see that the condition is what changes the denominator.

###### Strategy: Guided discovery through contrast. Let learners

compute both parts before any formula is named. Then make the contrast explicit on the board.

###### Procedure for the teacher:

1. Have learners complete Situation 1 parts 1 and 2, then pause for a show of answers.
2. Write the two results side by side so the change in denominator is visible.
3. Repeat for Situation 2, then move to the processing questions.

###### Answer to the task:

Situation 1. From the full deck, P(heart) = 13/52 = 1/4. Given that the card is red, the sample space shrinks to the 26 red cards, of which 13 are hearts, so the probability is 13/26 = 1/2. Situation 2. Results greater than 3 are {4, 5, 6}, so P(greater than 3) = 3/6 = 1/2. Given that the result is even, the sample space is {2, 4, 6}, and only {4, 6} are greater than 3, so the probability is 2/3.

###### Facilitating Reflection:

PQ1: the denominator shrank to the size of the group named in advance, from 52 to 26 and from 6 to 3. PQ2: the event did not change; restricting the sample space to the known group changed the number of possible outcomes, which changed the probability. PQ3: the probability is unchanged when the conditioned group has the same proportion as the whole. This is the independence

-----

| Processing Questions: 1. In each situation, what happened to the denominator once you were told something in advance? 2. The event you were asked about stayed the same in both parts. So what caused the probability to change? 3. Can you think of a case where being told something in advance would not change the probability at all? | condition learners met in LE2.3; B.2 states it with the new formula as P(A \| B) = P(A). Keep the answer short here. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding Naming and Computing Conditional Probability Note: Follow the development with your teacher. Copy the definition, the formula, and the two worked examples into your notebook. | Activity B.2. Deepening Conceptual Understanding space; conditional probability counts from a restricted one, the given event. The whole lesson is the single move of replacing the |

Conditional probability is the probability that event A occurs given that event B has already occurred. It is written P(A | B) and read as the **Purpose: Define conditional probability, present both forms of** probability of A given B. the formula, and justify the formula by restricting the sample

Counting within the restricted sample space gives the count form of the formula.

![](img_p95_1.png)

Dividing the top and bottom by n(S) gives the probability form.

| The two forms are connected by the short derivation below, which shows | 2. | Develop the count form from the restricted sample space, |
|---|---|---|
| why both give the same value when P(B) is not zero. |  | then divide the top and bottom by n(S) to reach the |

**Big idea: Simple probability counts from the whole sample**

denominator n(S) with n(B), and every example here is an instance of it.

space. The worked examples model the count form and the table form.

**Strategy: Direct instruction with worked examples. Use an I-**

do then we-do sequence. Derive the formula once, then work the two examples with the class.

###### Procedure for the teacher:

1. State the definition and the notation P(A | B), reading it aloud as the probability of A given B.

probability form.

![](img_p95_3.png)

3. Walk through Worked Example 1, pointing to the restriction from 52 cards to 26.
4. Work Example 2 by first marking the reviewed row, then reading 12 out of 15.
5. Close with the comparison table and the caution that the condition cannot be reversed without changing the answer.

-----

![](img_p96_1.png)

***Figure 4. The condition B becomes the new sample space; the overlap A***

*and B is the numerator.*

###### Worked Example 1. Drawing a heart, given red

A card is drawn and you are told it is red. Here A is the card is a heart and B is the card is red. There are 26 red cards, and 13 of them are hearts, so P(heart | red) = 13/26 = 1/2.

###### Worked Example 2. Reading from a two-way table

A class of 30 learners was grouped by whether they reviewed and whether they passed a quiz.

| Learner |  | Passed | Failed | Total |
|---|---|---|---|---|
| Reviewed |  | 12 | 3 | 15 |
| Did not |  | 6 | 9 | 15 |
| Total |  | 18 | 12 | 30 |
| To find P(passed \| these, 12 passed, comparison, the How simple and | so simple | Reviewed or not, by reviewed), restrict to P(passed \| reviewed) probability P(passed) conditional probability | quiz result. the 15 learners who = 12/15 = 4/5 = = 18/30 = differ | reviewed. Of 0.8. For 3/5 = 0.6. |
| Feature | Simple | probability | Conditional | probability |
| Question |  | Chance of A? | Chance of | A, given B? |
| Denominator | whole | space, n(S) | given event, | n(B) |
| Notation |  | P(A) | P(A \| | B) |

*Comparison of the two concepts.*

###### Answer to the task:

Worked Example 1: P(heart | red) = 13/26 = 1/2. Worked Example 2: P(passed | reviewed) = 12/15 = 4/5 = 0.8, while P(passed) = 18/30 = 0.6.

###### Facilitating Reflection:

PQ1: the denominator is n(B), the size of the given event, which is the restricted sample space. PQ2: only the 15 learners who reviewed are still possible once the condition is known, so the denominator is 15. PQ3: no. P(reviewed | passed) restricts to the 18 who passed, so the denominator is 18, not 15. This shows that the order of the condition matters. PQ4: P(A | B) = P(A). Substituting the LE2.3 rule P(A and B) = P(A) times P(B) into the formula and cancelling P(B) leaves P(A). In words, an independent condition carries no new information about A. *Teacher's Technical Note: The formula requires P(B) greater than* zero. Stress that P(A | B) and P(B | A) are generally different; the equal case and Bayes' Rule are developed in LE2.5. The independence derivation is not circular: the multiplication rule it uses was established in LE2.3 on its own, from the no-change idea and the tree and area models, not from this formula. The cancellation also needs P(B) greater than zero

-----

| Connecting to independence In LE2.3 you called two events independent when one does not change the chance of the other. The new formula shows why that idea takes the form P(A \| B) = P(A). If A and B are independent, then being told that B happened gives no new information about A, so the chance of A should stay the same. The formula gives the same result. Start from the definition, then use the multiplication rule P(A and B) = P(A) times P(B) that you proved for independent events in LE2.3. So the LE2.3 independence check is the special case of conditional probability in which the condition leaves the probability unchanged. Note: In general P(A \| B) is not the same as P(B \| A). Reversing the condition usually changes the answer. This is taken up again with Bayes' Rule in LE2.5. Key Takeaway: When a condition is given, the denominator changes from the whole sample space to the given event. Finding P(A \| B) is simple probability computed inside that smaller group. Processing Questions: 1. In the formula, which quantity sits in the denominator, and what does it represent? 2. In Worked Example 2, why is the denominator 15 and not 30? 3. Using the same table, would P(reviewed \| passed) use the same denominator as P(passed \| reviewed)? Explain. 4. For independent events, what does P(A \| B) equal, and why does the formula give that result? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are on the | Learning Activity Sheet.) |
| Activity B.3. Practicing | Learned Skills |

**Purpose: Build fluency in computing conditional probabilities across table reading and sequential drawing without replacement. The items**

are ordered from direct table reads to the harder without-replacement case.

-----

|  | Strategy: Guided practice with increasing difficulty. Vary one feature at the without-replacement setting, then a fresh table for transfer. Minimum success criterion: A learner who answers Set A items 1 and 2 confirms transfer. Procedure for the teacher: 1. Let learners attempt each set, then check answers as a class before the 2. For Set B, draw the count before and after the first item is removed. 3. Use the processing questions to surface the role of the condition and Answer to the task: Set A. Item 1: P(sports) = 120/200 = 3/5 = 0.6. Item 2: P(sports \| in a club) is about 0.417. Set B. Item 4: after a red is removed, 7 balls remain with 3 blue, so P(second 14 items remain with 8 pandesal, so P(second pandesal \| first pandesal) = Set C. Item 6: P(normal) = 70/150 = 7/15, about 0.467. Item 7: P(normal \| Facilitating Reflection: PQ1: item 2 conditions on club membership, so the denominator is 80; item order of the condition changes the denominator. PQ2: the first item is not returned, so the total for the second draw is one PQ3: the higher value for residents who exercise suggests an association cause, a point developed in C.1. | a time: first the direction of the condition within a table, then and Set B item 1 correctly is ready for the assessment. Set C next set. the shrinking total. = 50/80 = 0.625. Item 3: P(in a club \| sports) = 50/120, which blue \| first red) = 3/7. Item 5: after one pandesal is removed, 8/14 = 4/7. exercises) = 40/60 = 2/3, about 0.667. 3 conditions on playing sports, so the denominator is 120. The fewer. between exercise and normal blood pressure here. It is not proof of |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Does the Review Session Help? Instructions: Study the barangay data, answer the questions, then make a recommendation supported by your numbers. A barangay offered a free Saturday review before a math quiz. It recorded whether each of 100 youth attended the review and whether each passed the quiz. Youth Passed Failed Total Attended 42 18 60 Did not 16 24 40 Total 58 42 100 Review attendance and quiz result. 1. Find the probability that a youth passed the quiz. 2. Find the probability that a youth passed, given the youth attended the review. | Activity C.1. Making Real-World Connections Purpose: Apply conditional probability to a decision and separate association from cause. Learners use a within-group probability to judge whether a program helps. Strategy: Data-based decision making. Have learners compute both probabilities, then defend a recommendation using the comparison. Procedure for the teacher: 1. Confirm the simple probability P(passed) = 0.58 from the grand total. 2. Guide the within-row computation P(passed \| attended) = 0.70. 3. Lead the discussion on association versus cause and on the limits of one small sample. |

-----

| 3. Compare the two probabilities. Recommend whether the barangay should continue the review, and state one limitation of basing the decision on this data. Processing Questions: 1. Which of the two probabilities better tells the barangay whether the review helps those who attend? 2. The two probabilities differ. Does this prove that the review caused the passing? Why or why not? 3. What features of this data should make you careful before applying the result to other barangays? | Answer to the task: Item 1: P(passed) = 58/100 = 0.58. Item 2: P(passed \| attended) = 42/60 = 0.70. Item 3: 0.70 is greater than 0.58, so attending is associated with a higher passing rate here. A reasonable recommendation is to continue the review while noting that the data cannot prove cause and comes from only 100 youth in one barangay for one quiz. Figure 6. The passing rate is higher within the group that attended. Facilitating Reflection: PQ1: the conditional probability P(passed \| attended) speaks to those who attend, so it is the better guide for that group. PQ2: no. A higher conditional probability shows association, not cause. Youth who choose to attend may differ in other ways, such as study habits. PQ3: the sample is small, from a single barangay, and from one quiz, so the result may not carry over to other settings. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson Say It in One Sentence Instructions: Complete the statements, then write your own one- sentence summary. 1. Conditional probability is the chance of an event when we already know that ____. | Activity C.2. Wrapping up the Lesson Purpose: Consolidate the definition and the role of the restricted denominator in the learners' own words, and mark the boundary toward independence. Strategy : Structured summarizing. Collect a few learner sentences and refine one into a shared class statement. |

![](img_p99_1.png)

-----

2. To compute P(A | B), I divide the number of outcomes in \_\_\_\_ by the number of outcomes in \_\_\_\_.
3. In one sentence of your own, explain how simple and conditional probability differ.

###### Processing Questions:

1. Why must the denominator be the size of the given event rather than the whole sample space?
2. Can you describe a case where being told B would leave the probability of A unchanged?

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

**Purpose: Measure attainment of the objectives on distinguishing simple from conditional probability and computing P(A | B) from a**

restricted sample space.

**Item alignment: Part I covers Objectives 1 to 4. Part II covers Objectives 3 and 4. Part III covers Objectives 1 to 4. Answer Key, Part I (Multiple Choice):**

1. C. A conditional probability uses given prior information, here that the learner reviewed.
2. B. Conditioning on B restricts the sample space to the outcomes in B.
3. C. P(A | B) = 0.12 / 0.3 = 0.4.
4. A. P(helmet | bike) = 0.1 / 0.4 = 0.25.
5. B. Among the 12 face cards, 4 are Kings, so P(King | face card) = 4/12 = 1/3.

|  | Procedure for the teacher: 1. Have learners complete the statements individually, then read two or three aloud. 2. Steer toward the target generalization below; use the fallback prompts if learners stall. Target generalization: Conditional probability measures the chance of an event within a known, smaller group, so its denominator is the size of that group rather than the whole sample space. Answer to the task: Item 1: another event B has already occurred. Item 2: the outcomes in A and B, over the outcomes in B. Item 3: a correct sentence states that simple probability counts from the whole sample space while conditional probability counts from the given event. Fallback prompts: • Ask, after we are told B, which outcomes are still possible? • Ask, what number now sits under the line, and why? Facilitating Reflection: PQ1: once B is known, only the outcomes in B remain possible, so the count of possible outcomes is n(B). PQ2: the probability is unchanged when the proportion of A inside B equals the proportion of A overall. This is independence, met informally in LE2.3 and now stated exactly as P(A \| B) = P(A); keep the treatment brief here. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

-----

###### Answer Key, Part II (Constructed Response):

1. (a) P(on time | planner) = 18/24 = 3/4 = 0.75. (b) P(planner | on time) = 18/26 = 9/13 ≈ 0.69. The two differ because the condition changes the group considered.
2. P(computer | internet) = 0.45 / 0.6 = 0.75. Among households with internet, 75 percent also have a computer.

###### Answer Key, Part III (True or False with Reasoning):

1. False. P(A | B) and P(B | A) use different denominators, P(B) and P(A), so they are usually not equal.
2. True. Conditioning on B limits the outcomes considered to those in B.
3. True. P(A | B) = 0.2 / 0.5 = 0.4.
4. False. Conditional probability uses given prior information and a restricted sample space, while simple probability does not.
5. True. Independence means the condition does not change the probability, so P(A | B) = P(A).

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct method, correct answer, and a clear interpretation where the item asks for one. 3 Correct setup with one arithmetic slip, or a correct value without the requested interpretation. 1 Names the right rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

###### For Remediation

**Purpose: Give struggling learners a fixed routine for locating the condition and the restricted denominator. Procedure for the teacher:**

1. Model the four steps once with a different example, then let learners do this one.
2. Check that the denominator is the size of the condition, not the grand total.

###### Answer to the task:

Condition: owns a phone. Denominator: 30. Numerator: 24. Probability: 24/30 = 4/5 = 0.8.

###### Facilitating Reflection:

First prompt: the denominator is 30 because only phone owners are still possible once the condition is known. Second prompt: conditioning on app users would change the denominator to the number of app users.

-----

| III. CONTENT IV. OBJECTIVES | Purpose: Stretch ready learners by reversing the condition and noticing that the answers differ, which sets up Bayes' Rule. Procedure for the teacher: 1. Have learners compute both conditional probabilities and place them side by side. 2. Draw attention to the shared count of moviegoers who bought both items. Answer to the task: Item 1: P(drink \| popcorn) = 48/60 = 4/5 = 0.8. Item 2: P(popcorn \| drink) = 48/72 = 2/3, about 0.667. Item 3: they are not equal because the denominators differ, 60 for popcorn buyers and 72 for drink buyers, even though the numerator, the 48 who bought both, is the same. Facilitating Reflection: First prompt: the manager who wants to reach popcorn buyers uses P(drink \| popcorn). Second prompt: both numerators use the 48 moviegoers who bought both items, which is the bridge to Bayes' Rule in LE2.5. At the end of the lesson, the learners are will be able to: 1. state Bayes' Rule and connect it to conditional probability; and 2. apply Bayes' Rule to solve probability problems involving reverse conditional probabilities (e.g., diagnostic testing, classification). | Purpose: Stretch ready learners by reversing the condition and noticing that the answers differ, which sets up Bayes' Rule. 1. Have learners compute both conditional probabilities and place them side by side. 2. Draw attention to the shared count of moviegoers who bought both items. Item 1: P(drink \| popcorn) = 48/60 = 4/5 = 0.8. Item 2: P(popcorn \| drink) = 48/72 = 2/3, about 0.667. Item 3: they are not equal because the denominators differ, 60 for popcorn buyers and 72 for drink buyers, even though the numerator, the 48 who bought both, is the same. First prompt: the manager who wants to reach popcorn buyers uses P(drink \| popcorn). Second prompt: both numerators use the 48 moviegoers who bought both items, which is the bridge to Bayes' Rule in LE2.5. 1. state Bayes' Rule and connect it to conditional probability; and 2. apply Bayes' Rule to solve probability problems involving reverse conditional probabilities (e.g., diagnostic testing, classification). |
|---|---|---|
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Recalling Conditional Probability and Dependence Materials: printed table, pen, scratch paper. Instructions: Answer the three tasks below. Show your computations. Table 1. Club participation of 100 Grade 12 students Joined a Group Did not club STEM 24 16 Non- 18 42 STEM Total 42 58 |  |

1. Find P(joined a club | STEM). Read only the STEM row.
2. Find P(STEM | joined a club). Read only the joined-a-club column.
3. Two cards are drawn from a standard 52-card deck without replacement. Find P(first card is a heart), then P(second card is a heart | first card is a heart), then P(both cards are hearts).

| For | Enhancement |
|---|---|
| Lesson 2.5. | Bayes' Rule ANNOTATION |
| Total 40 60 100 | Activity A.1. Leveling Learners Readiness Purpose: Reactivate the two ideas Bayes' Rule is built from: conditional probability as restriction of the sample space, and the multiplication rule for dependent events. Strategy: Read-the-table recall Use a familiar two-way table so learners recover conditional probability quickly before new content begins. Procedure for the teacher: 1. Have learners shade the STEM row for Task 1 and the club column for Task 2, so the change of denominator is visible. 2. For Task 3, ask why one card is gone before the second draw. Answer to the task: 1. P(joined a club \| STEM) = 24/40 = 3/5 = 0.60. 2. P(STEM \| joined a club) = 24/42 = 4/7 ≈ 0.571. 3. P(first heart) = 13/52 = 1/4. P(second heart \| first heart) = 12/51 = 4/17. P(both hearts) = (13/52)(12/51) = (1/4)(4/17) = 1/17. Facilitating Reflection: PQ1. Intent: notice that reversing the condition changes the value. Answer: the two are not equal, 3/5 against 4/7, because each uses a different group as its base. |

-----

| Processing Questions: 1. Did P(joined a club \| STEM) equal P(STEM \| joined a club)? What does this say about the order of the condition? 2. In the card draw, why did the probability change from the first draw to the second? | PQ2. Intent: recall dependence. Answer: the first heart is not replaced, so 12 hearts remain out of 51 cards, which is the multiplication rule P(A ∩ B) = P(A) · P(B \| A) in action. Teacher's Technical Note: The result 12/51 simplifies to 4/17, not 4/7. Watch for this slip. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance The Defective Charger Problem Instructions: Read the scenario, then answer the orienting questions. You are not expected to finish the computation yet. Scenario An electronics shop buys phone chargers from two suppliers. Supplier A provides 70% of the stock, and 5% of Supplier A's chargers are defective. Supplier B provides 30% of the stock, and 20% of Supplier B's chargers are defective. A customer returns a charger that is defective. Which supplier more likely provided that defective charger? Figure 1. The forward and backward directions of reasoning Processing Questions: 1. The scenario gives you P(defective \| Supplier A). The question asks for P(Supplier A \| defective). Are these the same quantity? 2. Supplier A has the lower defect rate. Does that guarantee a returned defective charger came from Supplier B? Explain. | Activity A.2. Appreciating Lesson Relevance Purpose: Create the need for a method that reverses a conditional probability. The forward rates are given; the asked quantity runs backward, from the observed result to its cause. Strategy: Partial solve, then stall Let learners compute what they can with current tools, then reach the question they cannot yet answer. The gap motivates Bayes' Rule. Procedure for the teacher: 1. Ask the class to find the overall probability that a charger is defective. This is reachable with the multiplication and addition rules. 2. Then ask for P(Supplier A \| defective). Let the class see that the forward rates alone do not give it directly. 3. Name the new tool: Bayes' Rule, the topic of this lesson. Answer to the task: Overall defect probability: P(defective) = (0.70)(0.05) + (0.30)(0.20) = 0.035 + 0.060 = 0.095. The reverse probabilities, found later with Bayes' Rule, are P(Supplier A \| defective) = 0.035/0.095 = 7/19 ≈ 0.37 and P(Supplier B \| defective) = 0.060/0.095 = 12/19 ≈ 0.63. Supplier B is the more likely source, even though Supplier A supplies most of the stock. Facilitating Reflection: PQ1. Intent: separate the two directions. Answer: they are different. One conditions on the supplier, the other on the defect. PQ2. Intent: counter the base-rate intuition. Answer: no. Supplier B's high defect rate offsets its smaller share, so a defective charger is more likely from B. Teacher's Technical Note: Keep Figure 1 free of numbers. It shows direction only, so the computation stays in B.2. |

![](img_p103_1.png)

-----

| B. Instituting | B.1. Presenting Examples |  |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Two Directions of a Conditional Probability Materials: printed tables, colored pen or highlighter. Instructions: Study the two tables. For each, compute both directions of the conditional probability, then answer the processing questions. Table 2. Club membership and sports participation of 80 students Plays Group Does not Total sports Club 40 30 10 member Not a 40 20 20 member Total 50 30 80 1. Find P(plays sports \| club member) and P(club member \| plays sports). Table 3. Result of a health screening of 1,000 residents Tests Tests Group Total positive negative Has the 18 2 20 illness No 82 898 980 illness Total 100 900 1,000 2. Find P(has the illness), P(tests positive \| has the illness), and P(has the illness \| tests positive). | Activity B.1. Exploring Key Concepts Purpose: Let learners discover, from counts, that a reverse conditional probability restricts attention to the result group, and that a small base rate pulls the reverse probability far below the forward one. Strategy: Directed noticing Hold the structure fixed, a reverse conditional probability, while the base rate varies from balanced in Table 2 to rare in Table 3. The contrast is what makes the base-rate effect visible. Procedure for the teacher: 1. For each direction, have learners circle the group named after the bar, then divide within that group only. 2. Place the two tables side by side and ask what changed and what stayed the same. Answer to the task: 1. P(plays sports \| club member) = 30/40 = 0.75. P(club member \| plays sports) = 30/50 = 0.60. Same overlap, different base. 2. P(has the illness) = 20/1,000 = 0.02. P(tests positive \| has the illness) = 18/20 = 0.90. P(has the illness \| tests positive) = 18/100 = 0.18. Facilitating Reflection: PQ1. Intent: name the restriction. Answer: P(cause \| result) divides within the result group, P(result \| cause) divides within the cause group, so the denominators differ. PQ2. Intent: surface the base-rate effect. Answer: only 20 of 1,000 have the illness, so even at 90% detection the positives are mostly false positives, and the reverse probability drops to 0.18. |

| Group | Plays sports | Does not | Total |
|---|---|---|---|
| Club member | 30 | 10 |  |
| Not a member | 20 | 20 |  |
| Total | 50 | 30 |  |
|  |  |  |  |
| Group | Tests positive | Tests negative | Total |
| Has the illness | 18 | 2 | 20 |
| No illness | 82 | 898 |  |
| Total | 100 | 900 |  |

-----

![](img_p105_1.png)

**Figure 2. A condition restricts the sample space to one group** ***Processing Questions:***

1. In each table, how is P(cause | result) computed differently from P(result | cause)? Which group do you divide within each time?
2. In Table 3, why is P(has the illness | tests positive) so much smaller than P(tests positive | has the illness)?

###### B.2. Discussing the Concept

###### Activity B.2. Deepening Conceptual Understanding Deriving and Using Bayes' Rule Instructions:

Follow the derivation, then study the two worked examples. Bayes' Rule reverses a conditional probability.

###### From conditional probability to Bayes' Rule

Conditional probability gives P(A | E) = P(A ∩ E) / P(E). The symbol ∩ means and, so P(A ∩ E) is read as the probability of A and E. The multiplication rule gives P(A ∩ E) = P(A) · P(E | A). Substituting the second into the first gives the basic form of Bayes' Rule.

() · (|) = Here A is a cause or hypothesis and E is the observed result or evidence. The denominator P(E) is found by the law of total probability across all causes. For two causes, A and its complement A',

###### Activity B.2. Deepening Conceptual Understanding

**Purpose: Define Bayes' Rule, connect it to conditional probability and**

the multiplication rule, and apply it to two worked examples.

###### Big ideas:

- Bayes' Rule reverses a conditional probability. It turns the forward P(result | cause) into the reverse P(cause | result).
- Each cause is weighted by its prior probability and its likelihood. The denominator is the total probability of the result across all causes. (|)

###### Strategy:. Name, link, then apply

()

Work the three strands in order. Definitional: name the prior, the likelihood, the total probability, and the posterior, as labeled in Figure

3. Relational: show that Bayes' Rule is the conditional-probability formula with the multiplication rule in the numerator and the law of

-----

() · (|) total probability in the denominator. Procedural: list the apply steps, (|) =

() · (|) + (') · (|') that is, identify the causes, assign priors and likelihoods, compute When there are several causes A₁, A₂, up to Aₙ that are mutually the total probability, then divide. exclusive and cover all possibilities, the rule generalizes.

###### Procedure for the teacher:

() · (|) ( |) = 1. Derive the basic form on the board before showing the expanded

∑ () · (|)

form, so the denominator is seen to come from the law of total

![](img_p106_1.png)

probability. Keep the generalized form for three or more causes

brief here; learners apply it in the C.4 enrichment task.

2. For the box example, trace each branch of Figure 4 and show the branch probability as prior times likelihood.
3. For the screening, use the natural frequencies of Figure 5 first, then connect them to the formula.

###### Facilitating Reflection:

**Figure 3. The four parts of Bayes' Rule** PQ1. Intent: justify the denominator. Answer: the result can arise

from any cause, so its total probability sums the weighted likelihood **Worked example 1. Two boxes** over every cause, which keeps the posteriors summing to 1. Box 1 holds 2 red and 1 blue ball. Box 2 holds 1 red and 3 blue balls. A box is chosen at random, then one ball is drawn. The ball is red. PQ2. Intent: read the tree. Answer: a branch probability is the prior Find P(Box 1 | red). of the box times the likelihood of red in that box, for example The priors are P(Box 1) = P(Box 2) = 1/2. The likelihoods are P(red | (1/2)(2/3) = 1/3 for Box 1. Box 1) = 2/3 and P(red | Box 2) = 1/4.

1 2 ***Teacher's Technical Note:*** 2 3 8 ( 1| ) = = *The model assumes the causes are mutually exclusive and cover all*

1 2 1 1 11

+ *cases, and that the likelihoods are known. State this when applying* 2 3 2 4

*the rule.*

-----

![](img_p107_1.png)

**Figure 4. Probability tree for the two-box problem**

###### Worked example 2. Health screening

Return to Table 3 from B.1. Among 1,000 residents, 20 have the illness and 18 of them test positive, while 82 of the 980 healthy residents also test positive. Of the 100 positive results, only 18 are true.

18 18 ( | ) = ~~18 + 82 = 100 = 0.18~~

![](img_p107_2.png)

**Figure 5. Natural-frequency tree for the health screening**

###### Processing Questions:

1. Why is the denominator of Bayes' Rule the total probability of the result, taken over all causes, and not just one likelihood?
2. In the box tree, how is the probability along a single branch obtained from the prior and the likelihood?

-----

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity B.3. Practicing Learned Skills Working Bayes' Rule Across Cases Instructions:

Work the guided item with your teacher, then solve the independent set. State the prior, the likelihood, and the total probability in each item.

###### Guided practice

Two factories supply a store with identical phones. Factory 1 and Factory 2 each supply 50% of the phones. The defect rate is 2% for Factory 1 and 4% for Factory 2. A phone is found defective. Find P(Factory 2 | defective).

###### Independent practice

1. A rare illness affects 1% of a population. A test detects the illness 99% of the time, but it also returns a positive for 5% of healthy people. A person tests positive. Find P(illness | positive).
2. Two suppliers, A and B, each provide 50% of a part. The defect rate is 3% for A and 5% for B. A part is defective. Find P(supplier B | defective).
3. Machine 1 produces 80% of the bottles, Machine 2 produces 20%. The defect rate is 1% for Machine 1 and 5% for Machine 2. A bottle is defective. Find P(Machine 2 | defective).

###### Processing Questions:

1. Across these items, what made the posterior large or small, the prior or the likelihood?
2. When is the posterior P(cause | result) very different from the likelihood P(result | cause)?

###### C. C.1. Finding Practical Application

**Demonstrating Activity C.1. Making Real-World Connections**

| Knowledge and | Bayes' Rule in Authentic Contexts |
|---|---|
| Skills | Instructions: Solve each real-world task with Bayes' Rule. State your assumptions, |

compute, then interpret the answer in context.

1. A screening test for an illness is given in a community where 2% of people have the illness. The test is positive for 95% of people who have the illness and for 10% of people who do not. A person tests positive. Find P(illness | positive) and interpret it.
2. A plant has two machines. Machine A makes 70% of the items with a 3% defect rate. Machine B makes 30% with a 6% defect rate. An item is defective. Find P(Machine B | defective).

###### Activity B.3. Practicing Learned Skills

**Purpose: Build fluency with Bayes' Rule across items that vary the**

prior balance and the dominant factor while the structure stays fixed.

**Strategy: Guided then independent, with structural variation**

The items vary along one principle. The guided item has equal priors and unequal likelihoods. Item 1 has a rare prior. Item 2 has balanced priors. Item 3 has a dominant producer with a low defect rate. Comparing the answers shows how the prior and the likelihood each shape the posterior.

###### Answer to the task:

Guided: P(defective) = (0.5)(0.02) + (0.5)(0.04) = 0.01 + 0.02 = 0.03. P(Factory 2 | defective) = 0.02/0.03 = 2/3 ≈ 0.667.

1. P(positive) = (0.01)(0.99) + (0.99)(0.05) = 0.0099 + 0.0495 = 0.0594. P(illness | positive) = 0.0099/0.0594 = 1/6 ≈ 0.167.
2. P(defective) = (0.5)(0.03) + (0.5)(0.05) = 0.04. P(supplier B | defective) = 0.025/0.04 = 0.625.
3. P(defective) = (0.8)(0.01) + (0.2)(0.05) = 0.008 + 0.010 = 0.018. P(Machine 2 | defective) = 0.010/0.018 = 5/9 ≈ 0.556.

###### Facilitating Reflection:

PQ1. Intent: weigh prior against likelihood. Answer: both matter. A rare prior keeps the posterior low even with a strong likelihood, as in Item 1. PQ2. Intent: link to the base rate. Answer: the two directions diverge most when the prior is far from balanced, as in Items 1 and 3.

###### Activity C.1. Making Real-World Connections

**Purpose: Apply Bayes' Rule in authentic contexts and interpret the**

posterior, including the role of the base rate and the limits of a onefeature model.

###### Strategy: Model, compute, interpret

Run the modeling cycle for each task. State the assumptions, set the priors and likelihoods, compute the total probability, then read the posterior back into the situation.

###### Procedure for the teacher:

1. Have learners write the prior and the two likelihoods before computing.

-----

| 3. An email filter finds that 30% of incoming email is spam. The word free appears in 60% of spam and in 7% of non-spam. An email contains the word free. Find P(spam \| free). Processing Questions: 1. In Task 1, why is a positive result still more likely a false alarm than a true case? 2. In Task 3, what does the filter assume about the word free, and what does that assumption leave out? | 2. After Task 1, use Figure 6 to show why most positives are false positives when the illness is rare. Answer to the task: 1. P(positive) = (0.02)(0.95) + (0.98)(0.10) = 0.019 + 0.098 = 0.117. P(illness \| positive) = 0.019/0.117 ≈ 0.162, or 19 of 117 positives. A positive result is right only about 16% of the time here. 2. P(defective) = (0.70)(0.03) + (0.30)(0.06) = 0.021 + 0.018 = 0.039. P(Machine B \| defective) = 0.018/0.039 ≈ 0.46. 3. P(free) = (0.30)(0.60) + (0.70)(0.07) = 0.18 + 0.049 = 0.229. P(spam \| free) = 0.18/0.229 ≈ 0.79. Figure 6. Why a positive screen is usually a false positive Facilitating Reflection: PQ1. Intent: base-rate effect. Answer: the illness is rare, so the 98% who are healthy produce many false positives, about 98 against 19 true positives. PQ2. Intent: model limits. Answer: the filter assumes the word free alone signals spam at a fixed rate. It leaves out other words, sender history, and message context. |
|---|---|
| C.2. Making Generalization (Complete instructions for learners | are on the Learning Activity Sheet.) |
| Activity C.2. Wrapping Purpose: Consolidate the vocabulary and the structure of Bayes' Rule, Target conclusion (final form): Verbal: Bayes' Rule finds the probability of a cause given an observed dividing by the total probability of the result. Symbolic: P(cause \| result) result over all causes. | up the Lesson and set the boundary of the model. result by weighting each cause by its prior and its likelihood, then = P(cause) · P(result \| cause) divided by the total probability of the |

![](img_p109_1.png)

-----

| Strategy: Cloze then restate Eliciting prompt: ask learners to fill the blanks, then restate the rule without the bank. Fallback prompt: if a statement is partial, point to Figure 3 and ask which part of the formula it names. Answer to the task: 1. cause; result 2. prior probability 3. likelihood 4. total probability; all possible causes 5. posterior probability 6. reverse 7. conditional probability; multiplication rule Facilitating Reflection: PQ1. Intent: own the statement. Answer: any correct one-sentence version that names prior, likelihood, total probability, and posterior. PQ2. Intent: set the boundary. Answer: when there are more than two causes; the two-cause form splits the denominator over a cause and its complement, so three or more mutually exclusive causes require the generalized form. |
|---|
| C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.3. Assessing Learning Outcomes Purpose: Assess whether learners can apply Bayes' Rule to reverse conditional probabilities and reason about the base rate, at the level of the unit SA. Answer Key, Part I (Multiple Choice): 1. C. P(late) = (0.70)(0.08) + (0.30)(0.20) = 0.056 + 0.060 = 0.116. P(jeep \| late) = 0.060/0.116 ≈ 0.52. 2. A. P(defective) = (0.60)(0.02) + (0.40)(0.05) = 0.012 + 0.020 = 0.032. P(Machine 2 \| defective) = 0.020/0.032 = 0.625 ≈ 0.63. 3. B. P(positive) = (0.10)(0.80) + (0.90)(0.10) = 0.080 + 0.090 = 0.170. P(condition \| positive) = 0.080/0.170 ≈ 0.47. 4. C. P(cracked) = (0.80)(0.03) + (0.20)(0.08) = 0.024 + 0.016 = 0.040. P(Supplier Q \| cracked) = 0.016/0.040 = 0.40. 5. B. P(not fresh) = (0.65)(0.05) + (0.35)(0.12) = 0.0325 + 0.0420 = 0.0745. P(Vendor Y \| not fresh) = 0.0420/0.0745 ≈ 0.56. Answer Key, Part II (Constructed Response): 1. P(positive) = (0.05)(0.90) + (0.95)(0.16) = 0.045 + 0.152 = 0.197. P(dengue \| positive) = 0.045/0.197 ≈ 0.228. It is well below 0.90 because dengue is uncommon, so the 95% who are healthy produce many false positives. 2. P(defective) = (0.5)(0.03) + (0.5)(0.04) = 0.035. P(supplier Y \| defective) = 0.020/0.035 = 4/7 ≈ 0.571. Answer Key, Part III (True or False with Reasoning): 1. True. P(contaminated) = (0.55)(0.03) + (0.45)(0.04) = 0.0165 + 0.0180 = 0.0345. P(Plant B \| contaminated) = 0.0180/0.0345 ≈ 0.52, which is more than 0.5, so Plant B is the more likely source. 2. False. P(positive) = (0.02)(0.95) + (0.98)(0.08) = 0.019 + 0.0784 = 0.0974. P(disease \| positive) = 0.019/0.0974 ≈ 0.20, not 0.95. The 95% is the sensitivity P(positive \| disease), not the posterior, and the low base rate makes the posterior far smaller. 3. True. The defective weights are (0.5)(0.02) = 0.010 for A and (0.5)(0.06) = 0.030 for B, so P(defective) = 0.040. P(A \| defective) = 0.010/0.040 = 0.25 and P(B \| defective) = 0.030/0.040 = 0.75. The ratio 0.75 to 0.25 is 3 to 1, so B is three times as likely. 4. True. P(alarm) = (0.01)(1.00) + (0.99)(0.05) = 0.010 + 0.0495 = 0.0595. P(faulty \| alarm) = 0.010/0.0595 ≈ 0.168, so P(normal \| alarm) ≈ 0.832. A sounding alarm is more likely from a normal cycle. |

-----

5. False. P(cause | result) and P(result | cause) are the backward and forward directions, with different denominators, and are equal only in special cases. Treating them as equal is the inversion error that Bayes' Rule corrects.

###### Scoring approach and total points:

Part I: 2 points per item, correct option, 10 points. Part II: 5 points per item using the rubric below, 10 points. Part III: 3 points per item, 1 point for the correct verdict and 2 points for correct reasoning or a correct supporting computation, 15 points. Total: 35 points.

###### Rubric for constructed response (Part II): Score Anchor

5 Correct total probability, correct posterior, and a clear interpretation where asked. 3 Correct setup with one arithmetic slip, or correct value without the requested interpretation. 1 Names Bayes' Rule or sets a numerator but does not reach a usable answer. 0 No relevant setup.

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

**Purpose: Reinforce the rule for learners who need support, extend it to more than two causes, and apply it to a decision.**

###### For Remediation Reading counts from a frequency table

Whole counts let learners restrict to the late group before dividing, rebuilding the idea from B.1 without fractions of fractions.

###### Answer to the task:

P(tricycle | late) = 8/14 = 4/7 ≈ 0.571.

###### For Enrichment Three causes with the generalized rule

Three causes require summing three weighted likelihoods in the denominator, which is the generalized form from B.2.

###### Answer to the task:

P(spoiled) = (0.50)(0.02) + (0.30)(0.04) + (0.20)(0.05) = 0.010 + 0.012 + 0.010 = 0.032. P(A | spoiled) = 0.010/0.032 = 0.3125. P(B | spoiled) = 0.012/0.032 = 0.375. P(C | spoiled) = 0.010/0.032 = 0.3125.

###### For Extension

###### A decision from the posterior

The decision rests on the posterior, not the larger share, so learners must compute before choosing.

###### Answer to the task:

P(delayed) = (0.55)(0.12) + (0.45)(0.14) = 0.066 + 0.063 = 0.129. P(van | delayed) = 0.066/0.129 ≈ 0.512. Investigate the van first, since a delayed parcel is slightly more likely to have gone by van, though the two modes are close..

###### Facilitating Reflection:

PQ1. Intent: completeness of the denominator. Answer: the spoiled sack came from exactly one supplier, so the posteriors over all suppliers must cover every case and sum to 1.

-----

| V. ASSESSMENT | To evaluate learners' success in attaining the intended learning competencies, the assessment tools and strategies provided on the link in the table of contents can be utilized to measure understanding, skills, and application of concepts. |
|---|---|
| VI. REFLECTION | To assess and evaluate the effectiveness of the instruction, as well as to identify challenges and plan for improvements in this unit, teachers are encouraged to answer the reflective questions provided in the link indicated in the table of contents. |

###### UNIT 3. NUMBER THEORY

| I. LEARNING | GOALS |
|---|---|
| Content Standard | The learners demonstrate knowledge and understanding of divisibility, the greatest common divisor and least common multiple, and modular arithmetic as foundations for analyzing the structure of integers and solving problems in coding and verification. |
| Performance Standard | By the end of the unit, the learners are able to perform number-theoretic operations (GCD, LCM, modular arithmetic) and solve problems involving applications of modular arithmetic and linear Diophantine equations. |
| Learning Competencies | The learners: 1. prove properties of divisibility of integers; 2. illustrate prime and composite integers and the fundamental theorem of Arithmetic by formulating the prime factorization of positive integers; 3. compute the GCD and LCM of two positive integers by prime factorization and the Euclidean algorithm; 4. solve linear Diophantine Equation using the Euclidean Algorithm; 5. illustrate congruence modulo m and its properties 6. perform arithmetic operations and solve linear equations modulo m; 7. solve problems involving modular arithmetic (UPC codes, ISBN, Luhn's algorithm for credit card number verification); |
| II. REFERENCES | and MATERIALS |
| Textbook and Modules | Burton, David M. Elementary Number Theory. 7th ed. New York: McGraw-Hill Education, 2011. Burton, David M. Elementary Number Theory. 8th ed. New York: McGraw-Hill Education, 2024. (Information not found in sources; independently verify). Crisman, Karl-Dieter. Number Theory: In Context and Interactive. Wenham, MA: Gordon College, 2024. Department of Education. Learning Resources in Mathematics for Senior High School. Manila, Philippines: Department of Education, n.d. (Information not found in sources; independently verify). Department of Education. Strengthened Senior High School Curriculum: Finite Mathematics 2 Curriculum Guide. Manila, Philippines: Department of Education, n.d. (Information not found in sources; independently verify). GS1 US. "Barcode Types." April 30, 2026. https://www.gs1us.org/upcs-barcodes-prefixes/barcode-types. Murtagh, Jack. "What Is the Luhn Algorithm? The Math Behind Credit Card Transactions." Scientific American, November 11, 2025. https://www.scientificamerican.com/article/what-is-the-luhn-algorithm-the-math-behind-secure-credit-card-numbers/. Rex Bookstore, Inc. Mathematics in the Modern World. Manila: Rex Bookstore, 2022. (Information not found in sources; independently verify). Rosen, Kenneth H. Discrete Mathematics and Its Applications. 8th ed. New York: McGraw-Hill Education, 2019. (Information not found in sources; independently verify). Sundstrom, Ted. "3.5: The Division Algorithm and Congruence." LibreTexts Mathematics. Accessed May 22, 2026. https://math.libretexts.org/Courses/SUNY_Schenectady_County_Community_College/Discrete_Structures/03%3A_Constructing_and_ Writing_Proofs_in_Mathematics/3.05%3A_The_Division_Algorithm_and_Congruence. |

-----

|  | Wichita State University. "Modular Exponentiation." Discrete Mathematics. Accessed May 22, 2026. https://www.math.wichita.edu/discrete-book/section-numtheory-modularexp.html. |
|---|---|
| Websites | Borne, Andrew. "Solving Linear Congruences, Modular Arithmetic." YouTube video, 2020. https://www.youtube.com/watch?v=ViqgSWoSxN8. Brilliant Math & Science Wiki. "Modular Arithmetic." Accessed May 22, 2026. https://brilliant.org/wiki/modular-arithmetic/. GS1 US. "Barcode Types." April 30, 2026. https://www.gs1us.org/upcs-barcodes-prefixes/barcode-types. Khan Academy. "Euclidean Algorithm." Accessed May 7, 2026. https://www.khanacademy.org/math. (Information not found in sources; independently verify). Khan Academy. "Greatest Common Divisor and Least Common Multiple." Accessed May 7, 2026. https://www.khanacademy.org/math. (Information not found in sources; independently verify). Khan Academy. "Greatest Common Divisor, Least Common Multiple, and Modular Arithmetic." Accessed May 6, 2026. https://www.khanacademy.org/math. (Information not found in sources; independently verify). Khan Academy. "Number Theory." Accessed May 7, 2026. https://www.khanacademy.org/math. (Information not found in sources; independently verify). Math is Fun. "Diophantine Equations." Accessed May 8, 2026. https://www.mathsisfun.com/algebra/diophantine-equation.html. (Information not found in sources; independently verify). Math is Fun. "Divisibility Rules (Tests)." Accessed May 8, 2026. https://www.mathsisfun.com/divisibility-rules.html. (Information not found in sources; independently verify). Math is Fun. "Greatest Common Factor, Least Common Multiple, and Euclidean Algorithm." Accessed May 6, 2026. https://www.mathsisfun.com. (Information not found in sources; independently verify). Murtagh, Jack. "What Is the Luhn Algorithm? The Math Behind Credit Card Transactions." Scientific American, November 11, 2025. https://www.scientificamerican.com/article/what-is-the-luhn-algorithm-the-math-behind-secure-credit-card-numbers/. Penn, Michael. "Number Theory \| Linear Congruence Example 2." YouTube video, September 13, 2019. https://www.youtube.com/watch?v=HEAokut4F4I. Raji, Wissam. "3.3: Linear Congruences." LibreTexts Mathematics: Elementary Number Theory, 2021. https://math.libretexts.org/Bookshelves/Combinatorics_and_Discrete_Mathematics/Elementary_Number_Theory_(Raji)/03%3A_Congru ences/3.03%3A_Linear_Congruences. RH. "Modular Inverse Made Easy." YouTube video, August 25, 2014. https://www.youtube.com/watch?v=mgvA3z-vOz. |
| Video lessons | Khan Academy. "Euclidean Algorithm and Modular Arithmetic Lessons." Accessed May 6, 2026. https://www.khanacademy.org/math. (Information not found in sources; independently verify). Mathunlocked. "Modular Arithmetic: Basic and Beyond." YouTube video, 2024. https://www.youtube.com/watch?v=NFg6cw7vMuU Zach's Math Zone. "How to Determine ISBN-10 Check Digit." YouTube video, 2025. https://www.youtube.com/watch?v=jnqqpCCUJRE Zach's Math Zone. "The LUHN Algorithm for Verifying Credit Card Numbers." YouTube video, 2025. https://www.youtube.com/watch?v=61mgSpvrqkc |
| Materials and EdTech | Whiteboard, Markers, Learner worksheets, Colored paper, Activity sheets, Guided worksheets, Scientific calculators, Calculators, Manila paper, Cartolina, Counters, Index cards, Meta cards Laptop, Projector, Presentation slides, Television for presentation |
| AI Declaration | This lesson plan was developed with assistance from Microsoft Copilot, and ChatGPT, used for generating structured activities, worksheets, and assessment items aligned with DepEd learning standards. All generated content was reviewed, validated, revised, and contextualized by the writer to ensure alignment with the Strengthened Senior High School Curriculum, mathematical accuracy, age appropriateness, inclusivity, and pedagogical soundness. AI tools were used only to support the development process and not as a substitute for professional judgment and content validation. |

-----

| III. CONTENT |  |  |
|---|---|---|
| IV. OBJECTIVES | By the end of the lesson, learners are able to: 1. define divisibility: for integers a and b, a \| b if there exists an 2. examine concrete divisibility relations to identify properties then a \| bc for any integer c); and 3. justify properties of divisibility through direct argument from | integer k such that b = a · k; (e.g., if a \| b and a \| c, then a \| (b + c) and a \| (b - c); and if a \| b, the definition. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Spotting Exact Division Instructions: For the set of numbers 12, 15, 18, and 20, identify which numbers are divisible by each divisor below. Write your answers on a sheet of paper. 1. 2 2. 3 3. 5 |  |

![](img_p114_1.png)

*Figure 1. Exact division versus a remainder when 12 is grouped by* 3 and by 5.

###### Processing Questions

#### 1. What does it mean when a number is divisible by another 2. How can you tell quickly if a number is divisible by 2? By 3?

number?

By 5?

#### 3. Can a number be divisible by more than one number?

Explain.

###### Lesson 3.1. Divisibility and Its Properties

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness Purpose: This phase surfaces what learners already know about

exact division and prepares the shift from a remainder check to the formal idea of divisibility.

###### Procedure for the teacher:

1. Present the four numbers clearly and let learners test each 2. Invite several learners to explain their reasoning out loud.

3. Accept different strategies, such as divisibility rules, repeated

subtraction, or known multiplication facts.

#### 4. Bridge the responses toward the idea of exact division, that is,

division that leaves no remainder.

###### Answer to the task:

#### • Divisible by 2: 12, 18, 20. • Divisible by 3: 12, 15, 18. • Divisible by 5: 15, 20.

*Note: Some numbers are divisible by more than one divisor, for* example 12 is divisible by both 2 and 3. This helps learners notice overlapping divisibility.

###### If the check reveals a gap: if learners cannot decide divisibility by

2, 3, or 5, re-teach the quick checks with one shared example before B.1; otherwise proceed and scaffold the notation a | b in B.1.

###### Facilitating Reflection:

**PQ1. Intent: confirm the meaning of divisibility. Answer: A number is divisible by another when the division is exact,**

with no remainder, so the first number equals a whole-number multiple of the second.

**PQ2. Intent: recall quick divisibility checks.**

-----

| A.2. Establishing the Purpose of the Lesson | Answer: A number is divisible by 2 when it is even, by 3 when the sum of its digits is divisible by 3, and by 5 when it ends in 0 or 5. PQ3. Intent: see that divisors can overlap. Answer: Yes. A number can have several divisors at once, as 12 shows with 2 and 3. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Why Divisibility Matters Scenario: A school collects 120 food packs to share equally among 6 barangays for relief distribution. The packs must be shared fairly, with each barangay getting the same number and none left over. Figure 2. Sharing 120 relief packs equally among 6 barangays, with 20 packs each. You can check that 120 shared among 6 gives 20 each. But a barangay captain asks a harder question: how can we be sure a sharing comes out even, without listing every case? That is what this lesson builds toward, by stating and proving the rules of divisibility. Processing Questions: 1. What is this scenario asking us to make sure of? 2. Checking one case is easy. What do we still not have a method for? | Activity A.2: Appreciating Lesson Relevance Purpose: This phase sets the purpose of the lesson and signals that the work ahead involves reasoning and proof, not only computation. It uses one scenario to orient, not to teach the concept. Procedure for the teacher: 1. Present the single relief-goods scenario and let learners confirm 120 shares evenly among 6. 2. Draw out the gap: a single check does not tell us a rule that works for every case. 3. State that the lesson will define divisibility and prove its properties, so claims hold in general. 4. Keep the new vocabulary, such as the notation a \| b, for B.1 and B.2; do not formalize it here. Note: The task is solvable with current arithmetic (120 / 6 = 20). That is by design. Its job is to motivate the need for general rules, not to introduce the new concept. Facilitating Reflection: PQ1. Intent: state what the scenario is about. Answer: That the 120 packs can be shared equally among the 6 barangays, with none left over. PQ2. Intent: surface the gap that motivates the lesson. Answer: We can check one case by dividing, but we have no general rule that tells us, with certainty, when a sharing is exact for every case. |

![](img_p115_1.png)

-----

| B. Instituting | B.1. Presenting Examples |  |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts Discovering the Sum and Difference Pattern Instructions: 1. Complete the table below. 2. For each row, check whether the divisor divides the sum and the difference of the two numbers. 3. Observe the results and look for a pattern. 4. Answer the processing questions that follow. Is a \| (b + c) Divisor (a) Numbers (b, c) 3 9, 12 4 8, 20 5 10, 25 6 18, 8 |  |

###### Processing Questions

#### 1. If a divides both b and c, does it always divide their sum b + c 2. In the last row, c is not a multiple of a. What happens to the

and their difference b - c?

sum and the difference then?

#### 3. What pattern do you notice across the rows? 4. How does the divides notation, a | b, help you state these

relationships more precisely?

###### Activity B.1. Exploring Key Concepts

**Purpose: Through guided discovery, learners notice that a common**

divisor of two numbers also divides their sum and difference, and they see why both numbers must be divisible.

###### Procedure for the teacher:

#### 1. Provide the sets of numbers and ask learners to check the 2. Explain the divides notation: a | b means b is a multiple of a,

sum and the difference for each.

or a divides b exactly.

#### Is a | (b - c) 3. Facilitate discovery with prompts such as: What do you notice

**true? true?** in each row? If a divides both numbers, what happens when

we add or subtract them?

#### 4. Contrast the first three rows with the last row, where a divides 5. Link the pattern to the definition a | b if and only if b = a · k

only one number.

for an integer k, and prepare learners to prove it in B.2.

###### Answer to the task:

| Divisor (a) | Numbers (b, c) | a \| (b + c) | a \| (b - c) |
|---|---|---|---|
| 3 | 9, 12 | Yes, 21 = 3 · 7 | Yes, -3 = 3 · (-1) |
| 4 | 8, 20 | Yes, 28 = 4 · 7 | Yes, -12 = 4 · (-3) |
| 5 | 10, 25 | Yes, 35 = 5 · 7 | Yes, -15 = 5 · (-3) |
| 6 | 18, 8 | No, 26 is not 6 · k | No, 10 is not 6 · k |

*Note: The last row is a deliberate non-example. When a divides only* one of the two numbers, it need not divide their sum or difference. This is why the property requires a to divide both.

###### Facilitating Reflection:

**PQ1. Intent: surface the sum and difference pattern. Answer: Yes. When a divides both b and c, it divides b + c and b - c,**

as the first three rows show.

**PQ2. Intent: test the boundary of the property. Answer: If a divides only one number, the sum and difference are**

usually not divisible by a, as the last row shows with 6.

**PQ3. Intent: name the pattern.**

-----

| B.2. Discussing the Concept | Answer: A divisor shared by both numbers is also a divisor of their sum and their difference. PQ4. Intent: value the notation. Answer: The notation a \| b states the relationship in one symbol and lets us write and prove general statements. |
|---|---|
| Activity B.2. Deepening Conceptual Understanding The Three Basic Properties and Their Proofs Definition and statements Recall the definition of divisibility: a \| b if and only if b = a · k, where k is an integer and a is not zero. Three basic properties follow from this definition. They have equal standing in this lesson: • Sum: if a \| b and a \| c, then a \| (b + c). • Difference: if a \| b and a \| c, then a \| (b - c). • Multiplication: if a \| b, then a \| bc for any integer c. Direct-argument proofs For each property, write the given numbers as multiples of a, combine, then factor a back out. Sum and difference. Let b = a · k1 and c = a · k2. Then b + c = a(k1 + k2) and b - c = a(k1 - k2). Each factor is an integer, so a \| (b + c) and a \| (b - c). | Activity B.2. Deepening Conceptual Understanding Purpose: Through explicit teaching, learners meet the formal definition and see direct-argument proofs of the three basic properties, sum, difference, and multiplication, at equal standing. Big ideas: • Divisibility is multiple-hood: a \| b means b is a times an integer. • The three properties are one idea, each proved by writing the numbers as multiples of a and then factoring a back out. • The multiples of a are closed under addition, subtraction, and scaling. • A direct argument from the definition settles every integer at once, not only the examples checked. Procedure for the teacher: 1. Present the definition and stress that k is an integer and a is nonzero. 2. Model each proof on the board, narrating the write-as- multiple, combine, and factor-out steps. 3. Use Figure 3 for the two-input properties and Figure 4 for the multiplication property. 4. Have learners complete the quick check, then connect the properties to the meaning of a multiple. Answer to the task: Quick check (a = 3, b = 9, c = 12): b + c = 21 = 3 · 7, so 3 \| 21; b - c = -3 = 3 · (-1), so 3 \| (-3); and 9c = 3(3c) for any integer c, so 3 \| 9c, for example 3 \| 36 when c = 4. Teacher's Technical Note: By convention the divisor a is a nonzero integer, since division by zero is undefined. A divides n exactly when a divides -n, so the order of b and c does not affect the sum and difference properties. Facilitating Reflection: PQ1. Intent: justify the integer condition. |

![](img_p117_1.png)

-----

*Figure 3. Direct argument for the sum and difference properties* using blocks of size a.

**Multiplication. Let b = a · k. Then bc = (a · k)c = a(kc). Since kc is**

an integer, a | bc, so a divides every multiple of b.

**Answer: If k were not an integer, b would not be a whole-number**

multiple of a, so a would not divide b.

**PQ2. Intent: separate one-input from two-input properties. Answer: The multiplication property needs only a | b. The sum and**

difference properties need both a | b and a | c.

**PQ3. Intent: see why factoring closes the argument.**

![](img_p118_1.png)

**Answer: Factoring out a shows the result is a times an integer, which**

is exactly the definition of divisibility by a.

*Figure 4. Direct argument for the multiplication property using* blocks of size a.

###### How this connects

Saying a | b means b is a multiple of a. The three properties say that multiples of a stay multiples of a under addition, subtraction, and scaling. These same properties justify the Euclidean algorithm in LE3.3 and the arithmetic of congruences in LE3.5.

**Quick check: Verify all three properties with a = 3, b = 9, c = 12.** ***Processing Questions***

1. Why must k be an integer in b = a · k? 2. Which property needs only one given divisibility, and which

3. In each proof, why is factoring a back out the step that

finishes the argument?

-----

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity B.3. Practicing Learned Skills

**Purpose: Learners practice direct-argument justification, moving from concrete numbers to algebraic generalization.**

**Progression and practice plan: The set is sequenced by structural variation, not by surface difficulty. Items 1 to 4 use specific numbers**

(definition, then sum, difference, and both). Items 5 to 7 generalize to symbols (sum, difference, multiplication). Items 8 and 9 combine the properties into linear combinations. Use items 1 to 4 for guided practice with the teacher, and items 5 to 9 for independent practice. Minimum success criterion before C.1: a learner justifies items 5, 6, and 7 correctly, that is, the three general properties.

###### Procedure for the teacher:

• Ask learners to make their reasoning as visible as their algebra; each step should carry a clear justification.

- Reinforce the definition a | b if and only if b = a · k, with k an integer.

#### • Highlight factoring as the bridge from symbols to proof, and note that the integers are closed under addition, subtraction, and

multiplication.

###### Answer to the task:

###### 1. 8 = 2 · 4, and 4 is an integer, so 2 | 8.

2. **9 = 3 · 3 and 12 = 3 · 4, so b + c = 21 = 3 · 7, and 3 | 21.**
3. **15 = 5 · 3 and 25 = 5 · 5, so b - c = -10 = 5 · (-2), and 5 | (-10).**
4. **12 = 4 · 3 and 20 = 4 · 5, so b + c = 32 = 4 · 8 and b - c = -8 = 4 · (-2); thus 4 | (b + c) and 4 | (b - c).**
5. **b = a · k1, c = a · k2; b + c = a(k1 + k2), an integer multiple of a, so a | (b + c).**
6. **b - c = a(k1 - k2), an integer multiple of a, so a | (b - c).**
7. **b = a · k, so bc = (a · k)c = a(kc), and kc is an integer; thus a | bc. This is the multiplication property: a divides every multiple of b.**
8. **2b + 3c = 2(a · k1) + 3(a · k2) = a(2k1 + 3k2), so a | (2b + 3c).**
9. **mb + nc = m(a · k1) + n(a · k2) = a(mk1 + nk2); since mk1 + nk2 is an integer, a | (mb + nc).**

![](img_p119_1.png)

*Figure 5. Extending the sum, difference, and multiplication rules to any linear combination.*

-----

|  | Facilitating Reflection: PQ1. Intent: read the definition. Answer: Writing a number as a · k shows it is a multiple of a, which PQ2. Intent: the integer condition. Answer: Only an integer k makes b an exact multiple of a; a fractional PQ3. Intent: structure of the proof. Answer: The substitutions let us combine the equations and factor PQ4. Intent: meaning of factoring. Answer: Factoring out a shows the result is a times an integer, so a PQ5. Intent: closure. Answer: Sums and differences of integers are integers, so the factor PQ6. Intent: generalization. Answer: Any combination mb + nc factors as a(mk1 + nk2) with an | is what divisibility by a means. k would leave a remainder. out a, exposing the integer multiple. divides it. multiplying a stays an integer. integer factor, so a divides it for all integers m and n. |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Packing Care Packages Fairly Scenario: Your school is preparing care packages for community outreach. Each package must hold equal numbers of items, with none left over. The school received 72 notebooks and 108 pencils. | Activity C.1. Making Real-World Connections Purpose: Learners apply divisibility to a real grouping decision and justify it. The aim is sound reasoning, not a formal proof. Procedure for the teacher: 1. Discuss the outreach context and connect equal grouping to |

*Figure 6. Care-package set-up: 72 notebooks and 108 pencils to* share equally.

###### Instructions:

#### 1. Consider these candidate package counts: 5, 6, 9, and 12.

the notation a | b.

#### 2. Model the check with the definition: a | 72 means 72 = a · k 3. Have learners test each candidate count against both 72 and

for an integer k.

108.

#### 4. Close by linking the result to a practical decision, such as how

many equal packages to prepare.

###### Answer to the task:

• 5 fails: 72 = 5 · 14 + 2, so 5 does not divide 72. • 6 works: 72 = 6 · 12 and 108 = 6 · 18. • 9 works: 72 = 9 · 8 and 108 = 9 · 12.

- 12 works: 72 = 12 · 6 and 108 = 12 · 9.

-----

2. For each count a, check whether a divides 72 and whether a So 6, 9, and 12 give equal, complete packages, while 5 does not. For divides 108, using the notation a | b. any count that works, since it divides both 72 and 108, it also divides
3. Decide which counts let both the notebooks and the pencils their sum 180 and their difference 36, which connects back to the be shared equally with none left over. property proved in this lesson.

![](img_p121_1.png)

#### 4. Write a short justification, showing how divisibility supports

your decision.

###### Processing Questions

1. How does divisibility help keep a distribution fair? 2. Why must the chosen count divide both quantities exactly?

3. What happens if the count divides one quantity but not the

other?

#### 4. How could this reasoning apply to logistics, budgeting, or

scheduling?

*Figure 7. Testing candidate package counts against 72 and 108.*

*Note: The largest count that works here is 36, the greatest common* divisor of 72 and 108. Finding all such counts is the work of the later GCD lesson. This activity only tests the given candidates, which keeps it within divisibility.

###### Facilitating Reflection:

**PQ1. Intent: link fairness to divisibility. Answer: When the count divides the quantity exactly, every package**

gets the same amount with nothing left over.

**PQ2. Intent: both quantities must divide. Answer: A complete package needs equal notebooks and equal**

pencils, so the count must divide 72 and 108.

**PQ3. Intent: effect of a failed divisor. Answer: If the count divides only one quantity, the other cannot be**

shared evenly, so some items are left over.

**PQ4. Intent: transfer to other settings. Answer: The same check applies to splitting funds, time, or**

shipments into equal parts.

-----

| C.2. Making Generalization |  |
|---|---|
| Activity C.2. Wrapping up the Lesson Stating the Properties in Your Own Words Instructions: Using what you learned, write general statements that summarize the divisibility properties from this lesson: the sum and difference of two multiples, and a multiple of a multiple. Express each statement both in words and in symbols, so it applies to all integers a, b, and c. Processing Questions 1. What are the properties in words, and how do you write each in symbols? 2. The sum and difference properties need a to divide both b and c. Which property needs only one of them? 3. If a \| (b + c), does it follow that a \| b and a \| c? | Activity C.2. Wrapping up the Lesson Purpose: Learners state the lesson's generalizations in their own words, connecting words and symbols. The conclusion is stated by learners, not the teacher. Procedure for the teacher: • Review an earlier example, such as a = 3, b = 9, c = 12, to recall the patterns. • Elicit the generalizations with the prompt: in one or two sentences, what is always true about the sum, the difference, and the multiples of numbers that a divides? • Fallback prompt when the conclusion is partial or wrong: ask the learner to write each given number as a times an integer, then say what that forces about the sum, the difference, and any multiple. • Keep the statements concise and accept equivalent wording. Answer to the task: In words: If a divides b and a divides c, then a divides their sum and their difference. And if a divides b, then a divides every multiple of b. In symbols: If a \| b and a \| c, then a \| (b + c) and a \| (b - c). If a \| b, then a \| bc for any integer c. These hold for all integers a, b, and c with a not zero. Figure 8. The sum, difference, and multiplication properties of divisibility in words and symbols. Boundary of the conclusion: The converse is false. From a \| (b + c) we cannot conclude a \| b and a \| c; for example, 5 \| (2 + 3) but |

![](img_p122_1.png)

-----

| C.3. Evaluating Learning (Complete instructions for learners are | on the Learning Activity Sheet.) |
|---|---|
| Purpose: This phase is a summative check of the three objectives, Answer Key: Part I. 1. B. The definition states b = a · k for an integer k. 2. A. By the sum property, 7 \| (21 + 14) = 7 \| 35. 3. C. Both the sum and the difference are divisible by a. 4. C. The claim fails when a divides only b; 8 + 10 = 18 is not divisible 5. B. If b = a · k, then mb = a(mk), so a \| (mb). 6. A. With b = a · k1 and c = a · k2, mb + nc = a(mk1 + nk2). Part II. 1. Since a \| b and a \| c, write b = a · k 1 and c = a · k2. Then b - c = 2. Since a \| b, write b = a · k. Then 9b = 9(a · k) = a(9k), and 9k is an 3. Since a \| b and a \| c, write b = a · k 1 and c = a · k2. Then 3b + 2c Part III. 1. False. For example 2 \| 6, but 6 does not divide 2; the relation is 2. True. This is the sum property. 3. False. 4 = 8k would need k = one half, which is not an integer. 4. True. If b = a · k, then b + a = a(k + 1), so a \| (b + a). 5. True. If n = 5k, then 10n = 5(2n), so 5 \| 10n. | from the definition through justification. by 4. a(k1 - k2), and k1 - k2 is an integer, so a \| (b - c). integer, so a \| 9b. = 3(a · k1) + 2(a · k2) = a(3k1 + 2k2), so a \| (3b + 2c). not symmetric. |

5 divides neither 2 nor 3. The sum and difference properties also require a to divide both numbers, not just one.

###### Facilitating Reflection:

**PQ1. Intent: state the properties two ways. Answer: In words and in symbols as shown above; the two forms**

say the same thing.

**PQ2. Intent: separate one-input from two-input properties. Answer: The multiplication property needs only a | b. The sum and**

difference properties need both a | b and a | c.

**PQ3. Intent: warn against the converse. Answer: No. Dividing a sum does not force a to divide each part, as**

###### Activity C.3. Assessing Learning Outcomes

-----

| 6. False. The converse fails; 5 \| (2 + 3) but 5 divides neither 2 nor 3. Scoring guide for Part II: Award full credit when the response writes each given number as a multiple of a, manipulates correctly, factors out a, and states the conclusion from the definition. Award partial credit when the setup is correct but the factoring or the closing statement is missing. Award no credit when the definition is not used. Scoring approach and total points: Part I, 1 point each, 6 points. Part II, up to 3 points each, 9 points. Part III, 1 point for the correct True or False and 1 point for sound reasoning, 2 points each, 12 points. Total: 27 points.. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning For Remediation Purpose: This activity strengthens the definition for learners who need more practice. |

###### Procedure for the teacher:

1. Revisit the definition with simple examples and let learners compute and check each statement.

2. Encourage verbal reasoning before symbolic justification, for example, does 4 fit evenly into 12?

#### 3. Address the common mix-up between divides and is a multiple of.

###### Answer to the task:

• a. 4 | 12 is True; 12 = 4 · 3, so k = 3. • b. 6 | 20 is False; 20 = 6 · 3 + 2, so no integer k works.

- c. 5 | 25 is True; 25 = 5 · 5, so k = 5.

#### • d. 9 | 27 is True; 27 = 9 · 3, so k = 3. • e. 8 | 30 is False; 30 = 8 · 3 + 6, so no integer k works.

**Sentence: A number divides another exactly when the second is a whole-number multiple of the first, leaving no remainder.**

###### For Enhancement

**Purpose: This activity extends reasoning beyond the three basic properties, to the chain property and to testing a converse, through**

proof and counterexample.

###### Answer to the task:

1. **True. Since a | b, write b = a · k1. Since b | c, write c = b · k2 = (a · k1) · k2 = a(k1 · k2). Since k1 · k2 is an integer, a | c. This is the**

chain, or transitive, property.

2. **The converse is false. Counterexample: a = 5, b = 2, c = 3. Then a | (b + c) since 5 | 5, but 5 does not divide 2 and 5 does not divide 3.**

-----

![](img_p125_1.png)

*Figure 9. The chain property of divisibility.*

*Note: The chain property and the converse question go beyond the three basic properties of this lesson and preview the structural* reasoning used later in the unit. Both activities support mastery and prepare learners for prime factorization and modular arithmetic.

|  |  |  |
|---|---|---|
| III. CONTENT | Lesson 3.2. Primes, Fundamental Theorem | of Arithmetic, and Prime Factorization |
| IV. OBJECTIVES | At the end of the lesson, the learners are expected to: 1. distinguish prime and composite integers based on the number 2. list prime numbers up to a given bound using the Sieve of 3. state the Fundamental Theorem of Arithmetic from observation 4. formulate the prime factorization of given positive integers. | of positive divisors; Eratosthenes; of repeated factorizations of integers; and |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Sorting Numbers by Their Divisors Instructions: Recall how to find the positive divisors of a whole number. For each number below, list all of its positive divisors, then sort it into one of two groups. • Group A: numbers with exactly two positive divisors. • Group B: numbers with more than two positive divisors. Numbers: 1, 2, 6, 7, 9, 11, 12, 15. Show each number with its divisors, for example 12 has divisors 1, 2, 3, 4, 6, and 12. Processing Questions 1. Which numbers landed in Group A, with exactly two divisors? |  |

###### ANNOTATION

###### Activity A.1. Leveling Learner Readiness Purpose: Learners recall divisors and factors from Lesson 3.1

and surface the two-divisor pattern that defines a prime, the readiness needed for B.1 and B.2.

**Facilitation strategy: List the divisors of one prime and one**

composite side by side on the board, then have learners sort by the length of each divisor list rather than by the numbers themselves. Pair learners to check each other's lists before sorting.

###### Procedure for the teacher:

#### 1. Review how to list the positive divisors of a number using

quick examples such as 6 and 7.

-----

2. What do the Group A numbers have in common? 2. Have learners list divisors and sort the numbers, then

3. Where does 1 belong, and why is it hard to place? compare answers with a seatmate.

#### 3. Draw attention to the size of each divisor list, not just the

numbers themselves.

###### Answer to the task:

#### • Group A (exactly two divisors): 2 has 1, 2; 7 has 1, 7; 11 has • Group B (more than two divisors): 6 has 1, 2, 3, 6; 9 has 1,

1, 11.

3, 9; 12 has 1, 2, 3, 4, 6, 12; 15 has 1, 3, 5, 15.

#### • 1 has only one divisor, so it fits neither group.

![](img_p126_1.png)

*Figure 1. Sorting numbers by how many positive divisors they* have.

###### Facilitating Reflection:

**PQ1. Intent: spot the two-divisor numbers. Answer: 2, 7, and 11 each have exactly two divisors, 1 and the**

number itself.

**PQ2. Intent: name the common feature. Answer: Each Group A number is divisible only by 1 and itself,**

with no other divisors.

**PQ3. Intent: place the special case 1. Answer: 1 has only one divisor, so it is neither prime nor**

composite. This is a definition learners will use throughout the lesson.

-----

###### A.2. Establishing the Purpose of the Lesson

###### Activity A.2. Appreciating Lesson Relevance

###### Numbers That Refuse to Split Evenly Scenario: A class arranges 13 chairs into equal rows for a display.

They try 2 rows, then 3, then 4, but none come out even. The only equal arrangement is a single row of 13. With 12 chairs, several equal arrangements work, such as 2 rows of 6 or 3 rows of 4.

![](img_p127_1.png)

*Figure 2. Twelve items form several equal arrays, while thirteen form*

only a single line.

You can test arrangements one by one, but is there a faster way to tell which numbers split many ways and which split only one way? This lesson names and studies the numbers that split only one way.

###### Processing Questions

#### 1. What is special about 13 compared with 12 in this 2. Which other numbers do you expect to allow only a single equal

arrangement?

row?

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts

###### Finding the Primes: Classify, Then Sieve

###### Part 1. Classify by divisor count

###### Activity A.2. Appreciating Lesson Relevance Purpose: This phase sets the purpose of the lesson and orients

learners toward primes. It uses one scenario to motivate, not to teach the concept.

**Facilitation strategy: Elicit learner ideas by having each group**

try several row counts for 13 and report what happens, then contrast with 12. Let learners voice the puzzle in their own words before any term is named.

###### Procedure for the teacher:

#### 1. Present the single chair-arrangement scenario and let 2. Draw out the gap: testing arrangements one by one is slow,

learners test arrangements for 12 and 13.

and we have no quick rule yet.

#### 3. State that the lesson will name these numbers (primes) and 4. Hold the formal vocabulary for B.1 and B.2; here the goal is

study how every number is built from them.

relevance.

*Note: The scenario is solvable by testing arrangements, which is* by design. Its job is to motivate the study of primes, not to introduce the formal definition. Treat rotated arrays as the same arrangement, so a single row of 13 and a single column of 13 count once; the classification rests on the number of divisors, not the number of physical layouts.

###### Facilitating Reflection:

**PQ1. Intent: state what makes 13 different. Answer: 13 can be arranged only as a single row because its only**

divisors are 1 and 13; 12 has several divisors, so it allows several arrangements.

**PQ2. Intent: anticipate other primes. Answer: Numbers such as 2, 3, 5, 7, and 11 allow only a single**

equal row. These are the primes the lesson will define.

###### Activity B.1. Exploring Key Concepts Purpose: Through guided discovery, learners define prime and

composite by divisor count and generate the primes up to 50 with the sieve.

-----

**Instructions: A prime has exactly two positive divisors, 1 and itself.**

A composite has more than two. Classify each number, and give its number of divisors: 2, 4, 5, 8, 9, 11, 12, 15.

###### Part 2. The prime filter (Sieve of Eratosthenes)

###### Instructions: On a chart of the numbers 1 to 50, cross out 1. Circle

2, then cross out every other multiple of 2. Move to the next uncrossed number, circle it, and cross out its multiples. Repeat with 3, 5, and

7. The circled numbers are the primes.

###### Processing Questions

#### 1. What do all the circled numbers have in common in terms of 2. After you cross out the multiples of 2, 3, 5, and 7, why are the

divisors?

remaining numbers up to 50 all prime?

#### 3. Why is 1 crossed out rather than circled? 4. Which is the only even prime, and why is no other even number

prime?

**Strategy, what to highlight: Hold the criterion constant (exactly**

two divisors) while the numbers vary, so learners discern the invariant feature. Contrast odd composites such as 9 and 15 with odd primes such as 7 and 11 to block the idea that odd means prime.

###### Procedure for the teacher:

#### 1. For Part 1, have learners count divisors and state the rule in 2. For Part 2, model the first two rounds of crossing out, then

their own words.

let learners finish the sieve.

#### 3. Collect the circled numbers and confirm the list of primes up

to 50.

###### Answer to the task:

#### • Part 1: primes are 2 (1, 2), 5 (1, 5), 11 (1, 11); composites are

4 (3 divisors), 8 (4), 9 (3), 12 (6), 15 (4). Note 4 and 9 each have exactly three divisors.

#### • Part 2: the primes from 1 to 50 are 2, 3, 5, 7, 11, 13, 17, 19,

23, 29, 31, 37, 41, 43, 47, fifteen in all.

![](img_p128_1.png)

*Figure 3. The Sieve of Eratosthenes leaves the primes from 1 to* 50 circled.

###### Facilitating Reflection:

**PQ1. Intent: Name the shared feature of primes. Answer: Each circled number has exactly two positive divisors, 1**

and itself.

**PQ2. Intent: see why the sieve works up to 50. Answer: Any composite up to 50 has a prime factor of at most 7,**

so it is crossed out as a multiple of 2, 3, 5, or 7. What remains has

-----

| B.2. Discussing the Concept | no smaller prime factor, so it is prime. Sieving by 2, 3, 5, and 7 is enough because 7² = 49 is at most 50, while 11² = 121 is well past it. PQ3. Intent: place the special case 1. Answer: 1 has only one divisor, so it is neither prime nor composite. It is crossed out so the remaining list holds only primes. PQ4. Intent: identify the even prime. Answer: 2 is the only even prime. Every other even number has 2 as a divisor in addition to 1 and itself, so it has more than two divisors and is composite. |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Prime Factorization and the Fundamental Theorem of Arithmetic Definition and statement Prime factorization. A prime factorization of an integer greater than 1 writes it as a product of primes. Repeated primes are collected with exponents, for example 60 = 2 · 2 · 3 · 5 = 2² · 3 · 5. Fundamental Theorem of Arithmetic: every integer n greater than 1 is prime or can be written as a product of primes, and this prime factorization is unique except for the order in which the factors are written. Building a factorization with a factor tree Split the number into any two factors, then keep splitting each factor that is not prime until every branch ends in a prime. Collect repeated primes into exponents. Two learners may start a factor tree differently. The tree for 60 = 6 × 10 and the tree for 60 = 4 × 15 take different paths, yet both end in the same primes, 2, 2, 3, and 5. This is what the theorem promises. | Activity B.2. Deepening Conceptual Understanding Purpose: Through explicit teaching, learners formulate prime factorizations and, by observing that different trees give the same primes, state the Fundamental Theorem of Arithmetic. Big ideas: • Primes are the building blocks: every integer greater than 1 is built from primes. • A factor tree always ends in primes, because any composite factor splits further until only primes remain. • The prime factorization of a number is unique, except for the order of the factors. • Exponential form records how many times each prime appears, for example 2² · 3 · 5. Procedure for the teacher: 1. State the definition and the theorem; stress that 1 is excluded and that uniqueness is up to order. 2. Build the two factor trees for 60 on the board and compare the primes they produce (Figure 4). 3. Show how repeated primes are collected into exponents. 4. Have learners do the quick check, then connect the factorization to divisibility and to Lesson 3.3. Answer to the task: Quick check: 84 = 4 × 21 = (2 × 2) × (3 × 7), so 84 = 2² · 3 · 7. Any other starting split, such as 84 = 6 × 14, gives the same primes. Facilitating Reflection: PQ1. Intent: why 1 is excluded. |

-----

![](img_p130_1.png)

| Figure 4. Two factor trees for 60 end in the same primes, so the prime factorization is unique. How this connects Each prime in the factorization divides n, which links back to the divisibility of Lesson 3.1. Because the factorization is unique, it is a reliable fingerprint of a number. In Lesson 3.3 this fingerprint is used to compute the greatest common divisor and least common multiple. Quick check: Build a factor tree for 84 and write its prime factorization in exponential form. Processing Questions 1. Why does the theorem start at integers greater than 1, leaving out 1? 2. Why does a factor tree always end in primes, no matter how you start it? 3. Why does the order of the factors not change the factorization? | Answer: 1 is neither prime nor composite and has no prime factors, so the theorem speaks of integers greater than 1. PQ2. Intent: why trees terminate in primes. Answer: Any composite factor can be split into smaller factors greater than 1. The factors keep shrinking, so the process must end, and it ends only when every branch is prime. PQ3. Intent: order does not matter. Answer: Multiplication can be done in any order, so 2 · 2 · 3 · 5 and 5 · 3 · 2 · 2 are the same factorization. |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Purpose: Learners practice classifying numbers and building prime Progression and practice plan: The set is sequenced by structural primes, and the square of a prime (49 has three divisors). Part 2 increases powers, 90 and 120 use three primes, 150 repeats a prime, and 210 for independent practice. Minimum success criterion before C.1: a Procedure for the teacher: 1. For Part 1, have learners count divisors before deciding; confirm 2. For Part 2, model 72 with a factor tree (Figure 5), then release the 3. Require exponential form and a multiplication check for each | Learned Skills factorizations, moving from few to many distinct primes. variation. Part 1 varies the kind of number: prime, product of two the number of distinct primes: 72 uses two primes with high uses four distinct primes. Use Part 1 for guided practice and Part 2 learner factors 72, 90, and 120 correctly. the squares of primes are composite. rest for independent work. answer. |

-----

###### Answer to the task:

• Part 1: 17 prime (2 divisors); 21 = 3 · 7 composite (4); 29 prime (2); 35 = 5 · 7 composite (4); 49 = 7² composite (3); 51 = 3 · 17

- Part 2: 72 = 2³ · 3²; 90 = 2 · 3² · 5; 120 = 2³ · 3 · 5; 150 = 2 · 3 · 5²; 210 = 2 · 3 · 5 · 7.

![](img_p131_1.png)

|  | Figure 5. A worked factor tree Facilitating Reflection: PQ1. Intent: state a quick test. Answer: Try the small primes in turn, 2, 3, 5, 7, and so on. If none otherwise it is composite. PQ2. Intent: reflect on what makes a number harder to factor. Answer: Numbers with more distinct primes or higher powers took both needed more splitting than 150. PQ3. Intent: judge completeness. Answer: A factorization is complete when every factor is prime and the | for 72, giving 2³ · 3². divides the number up to its square root, the number is prime; more steps. 210 has four distinct primes and 72 has high powers, so product of the factors equals the original number. |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Primes and Factorization at Work Instructions: Apply prime factorization to each situation. Discuss your reasoning with a partner before writing your answer. Situation 1. Packing relief boxes | Activity C.1. Making Real-World Connections Purpose: Learners apply prime factorization to authentic grouping and verification tasks, which scaffolds the unit Performance Task. Facilitation strategy: Walk the modeling cycle for Situation 1: state the assumption that the boxes must be equal and full, |

-----

| A community pantry has 120 identical relief items to pack into equal boxes with none left over. Use the prime factorization of 120 to explain which equal box sizes are possible. Figure 6. Equal box sizes for 120 items are the divisors built from its prime factorization. Situation 2. Checking a claim A student claims that 84 and 90 have the same set of prime factors. Use prime factorization to decide whether the claim is true. Situation 3. Why codes use primes A security system multiplies two large primes to form a key. In one or two sentences, explain why the product of two large primes is hard for someone to factor back into those primes. Processing Questions 1. How does the prime factorization of 120 tell you all the possible equal box sizes? 2. How did factorization let you settle the claim about 84 and 90? 3. Why is a large product of two primes useful for keeping a code secure? | translate it into dividing 120, solve using the prime factorization, then check that each proposed size divides 120. During the share-out, surface the assumptions learners made and compare which strategies were most efficient. Procedure for the teacher: 1. For Situation 1, connect each equal box size to a divisor of 120 and show how the divisors come from the prime factorization. 2. For Situation 2, have learners factor both numbers before judging the claim. 3. For Situation 3, keep the explanation at the level of difficulty of factoring; do not develop the encryption algorithm. Answer to the task: • Situation 1: 120 = 2³ · 3 · 5. Each equal box size is a divisor formed from these primes, such as 8 boxes of 15, 5 boxes of 24, or 6 boxes of 20. A size such as 17 fails because it does not divide 120. • Situation 2: 84 = 2² · 3 · 7 and 90 = 2 · 3² · 5. The prime sets are 2, 3, 7 and 2, 3, 5, which differ, so the claim is false. • Situation 3: multiplying two primes is quick, but recovering the primes from a large product is very slow, so the product hides the primes that built it. Facilitating Reflection: PQ1. Intent: link divisors to factorization. Answer: Every divisor of 120 is a product of some of its primes, so the factorization lists all the equal box sizes at once. PQ2. Intent: use factorization to verify. Answer: Comparing the prime sets shows 84 and 90 do not share the same primes, so the claim is false. PQ3. Intent: appreciate the security idea. Answer: Factoring a large product back into its two primes takes a great deal of work, which is what keeps the key hard to break. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson Stating the Theorem in Your Own Words Instructions: Complete the statement that summarizes the lesson, then illustrate it with one example. | Activity C.2. Wrapping up the Lesson Purpose: Learners state the Fundamental Theorem of Arithmetic in their own words. The conclusion is stated by learners, not the teacher. |

![](img_p132_1.png)

-----

**Statement: Every integer greater than 1 is either a \_\_\_\_\_\_\_\_\_\_ or can**

be written as a product of \_\_\_\_\_\_\_\_\_\_, and this prime factorization is \_\_\_\_\_\_\_\_\_\_ except for the \_\_\_\_\_\_\_\_\_\_ of the factors. Write the completed statement in your notebook and illustrate it with one example, such as 36 = 2² · 3².

###### Processing Questions

1. State the theorem in one sentence in your own words. 2. Why does the statement begin at integers greater than 1?

3. Does writing the primes in a different order give a different

factorization?

**Target conclusion: Every integer greater than 1 is either a prime**

or can be written as a product of primes, and this prime factorization is unique except for the order of the factors.

###### Procedure for the teacher:

#### • Eliciting prompt: from your factor trees, what is always true

about how a number above 1 is built from primes, and how many such factorizations does it have?

#### • Fallback prompt when the conclusion is partial or wrong:

ask the learner to factor one number two ways and compare the primes, then state what stays the same.

#### • Accept equivalent wording, and confirm the example

matches the statement.

###### Answer to the task: Completed statement: Every integer greater than 1 is either a

prime or can be written as a product of primes, and this prime factorization is unique except for the order of the factors. Example: 36 = 2² · 3².

![](img_p133_1.png)

*Figure 7. The Fundamental Theorem of Arithmetic in words and* an example.

###### Facilitating Reflection:

**PQ1. Intent: state the theorem. Answer: Every whole number above 1 is a prime or a product of**

primes, and that product is the same every time, apart from the order.

**PQ2. Intent: why exclude 1.**

-----

| Answer: 1 is neither prime nor composite and has no prime factors, so the theorem speaks of integers greater than 1. PQ3. Intent: order does not matter. Answer: No. 2² · 3² and 3² · 2² are the same factorization, since the order of factors does not change a product. |
|---|
| C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.3. Assessing Learning Outcomes Answer Key: Part I (Multiple Choice) 1. C. 23 is prime; 21 = 3 · 7, 27 = 3³, and 1 is neither. 2. B. A prime has exactly two divisors, 1 and itself. 3. B. 60 = 2² · 3 · 5, so the distinct primes are 2, 3, and 5. 4. B. 2³ · 3² = 8 · 9 = 72; 2² · 3³ = 108 and 2³ · 3 = 24, and 8 × 9 is not a prime factorization. 5. C. 1 has only one divisor, so it is neither prime nor composite. 6. A. The theorem guarantees a unique factorization, apart from the order of the factors. Part II (Constructed Response) 1. 84 = 2² · 3 · 7. By the Fundamental Theorem of Arithmetic, every integer greater than 1 has a unique prime factorization apart from order, so this is the only one. 2. Primes from 1 to 30: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29. Part III (True or False with Reasoning) 1. False. 2 is even and prime, so not every even number is composite. 2. False. 1 has only one divisor, so it is neither prime nor composite. 3. False. 51 = 3 · 17, so it is composite. 4. True. 2² · 3² · 5 = 4 · 9 · 5 = 180. 5. False. By the Fundamental Theorem of Arithmetic, the prime factorization is unique apart from order. Rubric for the constructed-response items (Part II): • Item 1, 3 points: 3 for the correct factorization 2² · 3 · 7 in exponential form with a correct one-sentence reason citing the unique factorization; 2 for the correct factorization but a vague or incomplete reason; 1 for a partial factorization or a reason with no factorization; 0 for an incorrect or blank response. • Item 2, 3 points: 3 for all ten primes 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 with no extras; 2 for one or two primes missing or one non- prime included; 1 for several errors but a clear sieve method; 0 for an incorrect or blank response. Scoring approach and total points: Part I, 1 point each, 6 points. Part II, up to 3 points each for a correct answer with valid reasoning, 6 points. Part III, 1 point for the correct True or False and 1 point for sound reasoning, 2 points each, 10 points. Total: 22 points. |

-----

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

###### For Remediation

**Purpose: This activity rebuilds the prime-factorization skill for learners who need more practice. Procedure for the teacher:**

1. Have learners verify each answer by multiplying the prime factors back to the original number.

2. Watch for factors that are not yet prime, and prompt learners to split them further.

###### Answer to the task:

#### • 18 = 2 · 3²; 28 = 2² · 7; 45 = 3² · 5; 100 = 2² · 5².

###### For Enhancement Purpose: This activity extends prime factorization beyond the lesson, to counting divisors from the exponents.

**Facilitation strategy: Have learners write the prime factorization first, box each exponent, add one to each, then multiply. For 72, ask**

them to list all twelve divisors to confirm the count, so the rule is verified rather than taken on faith.

###### Answer to the task:

1. **72 = 2³ · 3². Adding one to each exponent gives (3 + 1)(2 + 1) = 12 positive divisors.**
2. **360 = 2³ · 3² · 5. Adding one to each exponent gives (3 + 1)(2 + 1)(1 + 1) = 24 positive divisors.**

![](img_p135_1.png)

*Figure 8. Counting the divisors of 72 from the exponents in its prime factorization.* *Note: The divisor-count rule goes beyond the four objectives of this lesson and previews counting techniques. It also prepares the* greatest common divisor and least common multiple work of Lesson 3.3, which reads the exponents in the same way.

-----

| III. CONTENT | Lesson 3.3. Computing the Greatest Common Divisor (GCD) and | Least Common Multiple (LCM) of Two Positive Integers Using |
|---|---|---|
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. define GCD and LCM through examples of common divisors 2. compute the GCD and LCM of two positive integers using prime 3. examine the iterative division process on small examples to 4. state and justify the Euclidean algorithm: gcd(a, b) = gcd(b, a 5. compute the GCD of two positive integers using the Euclidean 6. compute the LCM of two positive integers using the relation a · 7. compare the efficiency of prime factorization and the Euclidean | and common multiples of pairs of integers; factorization; recognize the basis of the Euclidean algorithm; mod b); algorithm; b = gcd(a, b) · lcm(a, b); and algorithm for inputs of different sizes. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Shared Multiples and Shared Divisors Instructions: Recall how to list multiples and divisors of a whole number, then work with a partner on both tasks. • Multiples: list the first several multiples of 6 and of 8, mark the values that appear in both lists, and name the smallest one. • Divisors: list all divisors of 24 and of 36, mark the values that appear in both lists, and name the greatest one. Processing Questions 1. Which numbers appear in both multiple lists, and which of these is the smallest? 2. Which numbers divide both 24 and 36, and which of these is the greatest? 3. How did you find the shared values in each task? |  |

###### Prime Factorization and the Euclidean Algorithm

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness Purpose: Learners recall multiples and divisors from earlier

lessons and surface the ideas of a common multiple and a common divisor, the readiness needed to define the LCM and the GCD.

**Facilitation strategy: Have learners build each list in full first,**

then circle the values shared by both lists before naming the smallest shared multiple and the greatest shared divisor. Pair learners to compare lists.

###### Procedure for the teacher:

#### 1. Review how to list multiples and how to list divisors with one 2. Have learners complete both tasks and mark the shared

quick example each.

values.

#### 3. Draw attention to the smallest shared multiple and the

greatest shared divisor, the two values the lesson will name.

###### Answer to the task:

#### • Multiples of 6: 6, 12, 18, 24, 30, 36, 42, 48. Multiples of 8:

8, 16, 24, 32, 40, 48. Shared: 24, 48, and so on; smallest is 24.

#### • Divisors of 24: 1, 2, 3, 4, 6, 8, 12, 24. Divisors of 36: 1, 2, 3,

4, 6, 9, 12, 18, 36. Shared: 1, 2, 3, 4, 6, 12; greatest is 12.

-----

![](img_p137_1.png)

*Figure 1. Common divisors of 24 and 36, and common multiples* of 6 and 8.

###### Facilitating Reflection:

**PQ1. Intent: surface the common multiples. Answer: 24 and 48 appear in both lists; the smallest is 24. PQ2. Intent: surface the common divisors. Answer: 1, 2, 3, 4, 6, and 12 divide both numbers; the greatest is**

12.

**PQ3. Intent: name the method. Answer: List each set fully, then compare the two lists and pick**

out the values that appear in both.

###### A.2. Establishing the Purpose of the Lesson

**Activity A.2. Appreciating Lesson Relevance Activity A.2. Appreciating Lesson Relevance**

**One Situation, Two Questions Purpose: This phase sets the purpose of the lesson and orients**

**Scenario: A school parade begins. Drummers strike every 24 counts** learners toward the GCD and the LCM. It uses one scenario to and cymbals crash every 36 counts, starting together. The parade also motivate, not to teach the methods. has 24 drummers and 36 flag-bearers who must line up in equal rows **Facilitation strategy: Let learners attempt both questions by** with no one left out. listing, then ask how the work would change if the counts were in

the hundreds. The slowness of listing motivates the methods that follow.

###### Procedure for the teacher:

#### 1. Present the single parade scenario and have learners identify

the two questions it raises.

-----

|  | Figure 2. One parade raises a least-common-multiple question and a greatest-common-divisor question. Listing multiples or divisors answers both questions for small numbers, but the lists grow long once the numbers are large. This lesson builds faster methods. Processing Questions 1. Which question is about a repeating event, and which is about equal sharing? 2. What would make listing multiples or divisors hard if the numbers were large? | 2. Draw out the gap: listing works for small numbers but is slow for large ones, and we have no quick method yet. 3. State that the lesson will build prime-factorization and Euclidean methods for both questions. Note: The scenario is solvable by listing, which is by design. Its job is to motivate efficient methods, not to introduce them. Answer or response to the task: The beats coincide again after the least common multiple of 24 and 36, which is 72 counts. The equal rows use the greatest common divisor of 24 and 36, which is 12 rows. Facilitating Reflection: PQ1. Intent: sort the two question types. Answer: The coinciding beats are a repeating-event question, answered by the LCM. The equal rows are an equal-sharing question, answered by the GCD. PQ2. Intent: feel the need for a method. Answer: Large numbers have long lists of multiples and many divisors, so listing becomes slow and error-prone. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Reading the GCD and LCM from the Prime Factors Task 1. Write 24 and 36 as products of primes. Line up the factorizations by prime. Mark the primes that appear in both, and note the power of each prime in each number. Task 2. Do the same for 8 and 9. Compare what happens when two numbers share no prime. Processing Questions 1. Which primes do 24 and 36 share, and which belong to only one number? | Activity B.1. Exploring Key Concepts Purpose: Through guided discovery, learners read the greatest common divisor and the least common multiple from lined-up prime factorizations. Strategy, what to highlight: Keep the two factorizations aligned by prime so the shared primes line up. Vary the example: 24 and 36 share the primes 2 and 3, while 8 and 9 share none. The contrast makes visible that the GCD is built only from shared primes. Procedure for the teacher: 1. Have learners factor each number and align the factorizations by prime. |

![](img_p138_1.png)

-----

#### 2. For a shared prime, do you take the smaller or the larger power 3. To build a multiple of both, do you take the smaller or the larger

to build a divisor of both?

power of each prime?

#### 4. What is the greatest common divisor of 8 and 9, and why?

#### 2. Guide them to take the lower power of each shared prime for

a common divisor, and the higher power of every prime for a common multiple.

#### 3. Use 8 and 9 to show the coprime case, where the only

common divisor is 1.

###### Answer to the task:

#### • 24 = 2³ · 3 and 36 = 2² · 3². Shared primes are 2 and 3.

Lowest powers give 2² · 3 = 12, the greatest common divisor. Highest powers give 2³ · 3² = 72, the least common multiple.

#### • 8 = 2³ and 9 = 3² share no prime, so their greatest common

divisor is 1 and their least common multiple is 2³ · 3² = 72, the product of the two numbers.

![](img_p139_1.png)

*Figure 3. Lining up the prime factors of 24 and 36 to read off the* GCD and the LCM.

###### Facilitating Reflection:

**PQ1. Intent: separate shared from unshared primes. Answer: 24 and 36 share 2 and 3. The extra factor of 2 belongs**

only to 24, and the extra factor of 3 belongs only to 36.

**PQ2. Intent: lowest power gives a common divisor. Answer: Take the smaller power of each shared prime, because a**

divisor of both cannot use more of a prime than the number with fewer of it has.

**PQ3. Intent: highest power gives a common multiple. Answer: Take the larger power of each prime, because a multiple**

of both must contain enough of every prime for each number.

**PQ4. Intent: the coprime case. Answer: 8 and 9 share no prime, so the greatest common divisor**

is 1. Numbers with no common prime are called relatively prime.

-----

| B.2. Discussing the Concept |  |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Two Methods for the GCD and the LCM This builds on B.1, where lining up the prime factors of 24 and 36 gave a greatest common divisor and a least common multiple. Here we name the method exactly, then add a second method, the Euclidean algorithm. Definitions Greatest common divisor. The greatest common divisor of two positive integers a and b, written gcd(a, b), is the greatest positive integer that divides both a and b exactly. Least common multiple. The least common multiple of a and b, written lcm(a, b), is the smallest positive integer that is a multiple of both a and b. Method 1. Prime factorization Factor each number into primes. For the GCD, multiply each shared prime raised to its lower power. For the LCM, multiply every prime raised to its higher power. For 24 = 2³ · 3 and 36 = 2² · 3², this gives gcd(24, 36) = 2² · 3 = 12 and lcm(24, 36) = 2³ · 3² = 72. Method 2. The Euclidean algorithm Watch what repeated division does. Divide the larger number by the smaller and keep the remainder. Then divide the previous divisor by that remainder, and repeat. The last nonzero remainder is the GCD. The rule: gcd(a, b) = gcd(b, a mod b), where a mod b is the remainder when a is divided by b. Repeat until the remainder is 0. | Activity B.2. Deepening Conceptual Understanding Purpose: Through explicit teaching, learners define the GCD and LCM, compute them by prime factorization and by the Euclidean algorithm, justify the algorithm, and relate the two values through the product relation. Big ideas: • The GCD is the greatest divisor shared by both numbers; the LCM is the smallest multiple shared by both. • Prime factorization gives both at once: lowest powers for the GCD, highest powers for the LCM. • The Euclidean algorithm finds the GCD by repeated division, because each step keeps the same set of common divisors. • The product relation a · b = gcd(a, b) · lcm(a, b) links the two, so lcm(a, b) = (a · b) ÷ gcd(a, b). • The Euclidean algorithm scales to large numbers, while factoring does not. Strategy, what to highlight: Definitional: keep GCD and LCM distinct, a divisor versus a multiple. Procedural: model both methods on the same pair, 24 and 36, so learners see they agree. Relational: use the product relation to connect the GCD and the LCM rather than treating them separately. Optional analogy: For learners who want a picture of the Euclidean algorithm, note that gcd(a, b) is the side of the largest square tile that exactly fills an a by b rectangle, and each division step lays as many of those squares as possible before moving to the leftover strip. Offer this only if it helps; it is not required. Procedure for the teacher: 1. State the two definitions and the two notations. 2. Work the prime-factorization method on 24 and 36, then the Euclidean algorithm on 36 and 24 (Figure 4); note both give 12. 3. Justify the algorithm by tracking common divisors, then derive the LCM with the product relation (Figure 5). |

![](img_p140_1.png)

-----

*Figure 4. The Euclidean algorithm finds gcd(36, 24) by repeated* division.

**Why it works: Any number that divides both a and b also divides the**

remainder a mod b, since the remainder equals a minus a wholenumber multiple of b. The reverse holds too. So the pair (a, b) and the pair (b, a mod b) have exactly the same common divisors, and therefore the same greatest one.

###### The GCD and LCM product relation

For any two positive integers, a · b = gcd(a, b) · lcm(a, b). Once the GCD is known, the LCM follows by dividing the product by the GCD. As a consequence, when gcd(a, b) = 1 the LCM equals a · b, so if a and b are relatively prime and each divides an integer k, then a · b divides k, since the LCM divides every common multiple.

#### 4. Close with the efficiency comparison, then have learners do

the quick check.

###### Answer to the task: Quick check: Euclidean: 48 = 18 · 2 + 12, 18 = 12 · 1 + 6, 12 = 6

- 2 + 0, so gcd(48, 18) = 6. Product relation: lcm(48, 18) = (48 · 18) ÷ 6 = 864 ÷ 6 = 144.

![](img_p141_1.png)

*Figure 5. The product relation gives the LCM once the GCD is known.*

###### Choosing a method

Prime factorization is clear for small numbers and gives the GCD and the LCM at once. For large numbers it is slow, because factoring large numbers is hard. The Euclidean algorithm uses only division and stays fast even for large numbers, so it is the better choice there.

**Quick check: Find gcd(48, 18) by the Euclidean algorithm, then find**

lcm(48, 18) using the product relation.

###### Processing Questions

#### 1. Why does replacing the larger number with the remainder leave

the GCD unchanged?

###### Facilitating Reflection:

**PQ1. Intent: justify the algorithm. Answer: The remainder is the larger number minus a multiple of**

the smaller, so every common divisor of the two numbers also divides the remainder, and the reverse holds. The common divisors, and so the greatest one, do not change.

**PQ2. Intent: use the product relation. Answer: Because a · b = gcd(a, b) · lcm(a, b), dividing the product**

by the GCD gives the LCM directly, with no list of multiples.

**PQ3. Intent: weigh efficiency. Answer: The Euclidean algorithm, because it needs only a few**

divisions, while factoring large numbers is slow.

-----

| 2. Why does knowing the GCD let you find the LCM without listing multiples? 3. For two large numbers, which method would you choose, and why? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are on | the Learning Activity Sheet.) |
| Activity B.3. Practicing Learned Skills GCD and LCM Skills Drill Part 1. Prime factorization Find the GCD and the LCM of each pair using prime factorization. 1. 18 and 24 2. 40 and 60 Part 2. Euclidean algorithm and the product relation Find each GCD by the Euclidean algorithm, then find the LCM using the product relation. 3. gcd(84, 30), then lcm(84, 30) 4. gcd(120, 45), then lcm(120, 45) Part 3. Compare the methods Find gcd(204, 85) by the Euclidean algorithm. Then explain why prime factorization would be slower for this pair. Processing Questions 1. Which method did you choose for each part, and why? 2. In the Euclidean algorithm, how did you know when to stop? 3. How did you get each LCM once you had the GCD? | Activity B.3. Practicing Learned Skills Purpose: Learners practice both methods and the product relation, then compare the methods on a larger pair. Progression and practice plan: The set is sequenced by method and by size. Part 1 uses prime factorization on small pairs as guided practice. Part 2 uses the Euclidean algorithm and the product relation as independent practice. Part 3 raises the size so the efficiency of the Euclidean algorithm shows. Minimum success criterion before C.1: correct GCD and LCM for both Part 1 pairs and at least one Part 2 pair. Strategy for guided and independent practice: Work the first Part 1 pair with the class, then release Part 1 and Part 2 for independent work. Bring the class back together for Part 3 to discuss why method choice matters. Procedure for the teacher: 1. Require correct notation, gcd(a, b) and lcm(a, b), and a remainder column for the Euclidean work. 2. For Part 2, have learners get the GCD first, then divide the product by it for the LCM. 3. For Part 3, have learners count the division steps and weigh them against factoring 204 and 85. Answer to the task: • Part 1: 18 = 2 · 3² and 24 = 2³ · 3 give gcd = 6 and lcm = 72. 40 = 2³ · 5 and 60 = 2² · 3 · 5 give gcd = 20 and lcm = 120. • Part 2: gcd(84, 30): 84 = 30 · 2 + 24, 30 = 24 · 1 + 6, 24 = 6 · 4 + 0, so gcd = 6, and lcm = (84 · 30) ÷ 6 = 420. gcd(120, 45): 120 = 45 · 2 + 30, 45 = 30 · 1 + 15, 30 = 15 · 2 + 0, so gcd = 15, and lcm = (120 · 45) ÷ 15 = 360. • Part 3: gcd(204, 85): 204 = 85 · 2 + 34, 85 = 34 · 2 + 17, 34 = 17 · 2 + 0, so gcd = 17. Factoring 204 = 2² · 3 · 17 and 85 = 5 · 17 takes more work than three divisions. Facilitating Reflection: PQ1. Intent: match method to task. |

-----

| C. | C.1. Finding Practical Application | Answer: Prime factorization suits small pairs and gives both values at once; the Euclidean algorithm suits larger pairs and finds the GCD quickly. PQ2. Intent: stopping rule. Answer: Stop when the remainder is 0; the GCD is the last nonzero remainder. PQ3. Intent: GCD to LCM. Answer: Multiply the two numbers, then divide by the GCD. |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections GCD and LCM in Planning Instructions: Apply the GCD and the LCM to each situation. Discuss your reasoning with a partner before writing your answer. Situation 1. Terminal and tickets Two shuttles leave a terminal together, one every 12 minutes and one every 18 minutes. A dispatcher also needs to sort 48 route cards and 36 fare slips into equal sets with nothing left over. Find when the shuttles next leave together, and the greatest number of equal sets the dispatcher can make. Figure 6. Recurring schedules use the LCM; equal sharing uses the GCD. Situation 2. Choosing a method To find gcd(308, 165), decide whether prime factorization or the Euclidean algorithm would be faster, then compute the GCD by the method you chose. Processing Questions 1. Which question in Situation 1 needs the LCM, and which needs the GCD? 2. In Situation 2, why is the Euclidean algorithm the faster choice? | Activity C.1. Making Real-World Connections Purpose: Learners apply the GCD and the LCM to authentic scheduling and grouping tasks, which scaffolds the unit Performance Task. Facilitation strategy: Walk the modeling cycle for Situation 1: state the assumption that the shuttles start together and that sets must be equal and full, translate each question into an LCM or a GCD, solve, then check that the answer fits the situation. Compare method choices in Situation 2. Procedure for the teacher: 1. For Situation 1, tie the coinciding departures to the LCM and the equal sets to the GCD. 2. For Situation 2, have learners weigh the cost of factoring against a few divisions before computing. 3. Ask learners to state the assumption behind each model, such as both shuttles starting together. Answer to the task: • Situation 1: lcm(12, 18) = 36, so the shuttles next leave together after 36 minutes. gcd(48, 36) = 12, so the dispatcher can make 12 equal sets. • Situation 2: the Euclidean algorithm is faster. 308 = 165 · 1 + 143, 165 = 143 · 1 + 22, 143 = 22 · 6 + 11, 22 = 11 · 2 + 0, so gcd(308, 165) = 11. Facilitating Reflection: PQ1. Intent: match question to tool. Answer: The next shared departure is an LCM question; the equal sets is a GCD question. PQ2. Intent: justify the method. Answer: Factoring 308 and 165 takes more work than the four divisions of the Euclidean algorithm, so the algorithm is faster. |

![](img_p143_1.png)

-----

| 3. What must be true about the items for the GCD to give equal sets with none left over? | PQ3. Intent: surface the assumption. Answer: The two counts must both be divisible by the set size, so the set size must be a common divisor, and the greatest one gives the most equal sets. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson Tying the Methods Together Instructions: Complete the summary, then illustrate it with one worked pair such as 24 and 36. Statement: To find the GCD and the LCM of two numbers, I can use __________, taking lowest powers for the GCD and highest powers for the LCM. For the GCD alone I can use the __________ algorithm. Once I know the GCD, the LCM is __________. For large numbers, the __________ method is faster. Processing Questions: 1. In one sentence, how are the GCD and the LCM related? 2. When is prime factorization a good choice, and when is the Euclidean algorithm better? 3. Does the relation lcm = (a · b) ÷ gcd work for three numbers? | Activity C.2. Wrapping up the Lesson Purpose: Learners state the relationships among the two methods, the product relation, and the efficiency trade-off. The conclusion is stated by learners, not the teacher. Target conclusion: To find the GCD and the LCM, use prime factorization, taking lowest powers for the GCD and highest powers for the LCM; for the GCD alone use the Euclidean algorithm; once the GCD is known, lcm(a, b) = (a · b) ÷ gcd(a, b); for large numbers the Euclidean method is faster. Procedure for the teacher: • Eliciting prompt: from your work today, what are the ways to find the GCD and the LCM, and how do you move from one to the other? • Fallback prompt when the statement is partial: ask learners to find the GCD and LCM of 24 and 36 by both methods and then connect the two values. • Accept equivalent wording, and confirm the worked pair matches the statement. Figure 7. The methods, the product relation, and the efficiency trade-off at a glance. |

![](img_p144_1.png)

-----

| C.3. Evaluating Learning |  |
|---|---|
| Answer Key: Part I (Multiple Choice) 1. C. The GCD is the greatest positive integer dividing both exactly. 2. C. 6 = 2 · 3 and 8 = 2³, so lcm = 2³ · 3 = 24. 3. C. The Euclidean algorithm needs only a few divisions, while factoring 4. B. The GCD is the last nonzero remainder. 5. C. Since a · b = gcd · lcm, a · b = 6 · 180 = 1080. 6. B. 42 divides both 84 and 126 and is greater than 21, so gcd(84, Part II (Constructed Response) 1. gcd(72, 30): 72 = 30 · 2 + 12, 30 = 12 · 2 + 6, 12 = 6 · 2 + 0. The 2. 18 = 2 · 3² and 24 = 2³ · 3, so lcm(18, 24) = 2³ · 3² = 72. Check: gcd Part III (True or False with Reasoning) 1. True. The GCD divides the smaller number, so it cannot exceed 2. False. lcm(a, b) = a · b only when gcd(a, b) = 1; otherwise it is 3. True. This is the rule the Euclidean algorithm repeats until the 4. True. 8 = 2³ and 9 = 3² share no prime, so their GCD is 1. 5. False. Factoring large numbers is slow, so the Euclidean algorithm | large numbers is slow. 126) = 42, not 21. last nonzero remainder is 6, so gcd(72, 30) = 6. = 6, and 18 · 24 = 432 = 6 · 72. it. smaller. remainder is 0. is usually faster. |

|  | Answer to the task: Completed statement: prime factorization; Euclidean; (a · b) ÷ gcd(a, b); Euclidean. Example: gcd(24, 36) = 12 and lcm(24, 36) = 72, with 24 · 36 = 12 · 72. Facilitating Reflection: PQ1. Intent: state the relation. Answer: Their product equals the product of the two numbers, so lcm(a, b) = (a · b) ÷ gcd(a, b). PQ2. Intent: choose a method. Answer: Prime factorization is clear for small numbers and gives both values at once; the Euclidean algorithm is better for large numbers. PQ3. Intent: mark the boundary. Answer: No. The product relation holds for two numbers only; for three numbers the product of the three does not equal the GCD times the LCM. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

-----

| Rubric for the constructed-response items (Part II): • Item 1, 4 points: 2 for correct division steps with remainders shown, 2 for the correct GCD identified as the last nonzero remainder. Partial credit for correct steps with a wrong final reading. • Item 2, 4 points: 2 for the correct LCM from prime factorization, 2 for a correct verification using the product relation. Partial credit for a correct LCM with no verification. Scoring approach and total points: Part I, 1 point each, 6 points. Part II, up to 4 points each, 8 points. Part III, 1 point for the correct True or False and 1 point for sound reasoning, 2 points each, 10 points. Total: 24 points. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning For Remediation Purpose: This activity rebuilds the prime-factorization method for the GCD and the LCM for learners who need more practice. Facilitation strategy: 1. Have learners factor each number first, then take lowest powers for the GCD and highest powers for the LCM. 2. Check each answer against the definitions: the GCD divides both, and the LCM is a multiple of both. Answer to the task: • 12 and 18: gcd = 6, lcm = 36. 20 and 30: gcd = 10, lcm = 60. 16 and 24: gcd = 8, lcm = 48.. For Enhancement Purpose: This activity extends the methos to three numbers and tests the limit of the two-number product relation. Facilitation strategy: Have learners align all three factorizations by prime, then take lowest powers for the GCD and highest powers for the LCM. Ask them to compute both sides of the product test before drawing a conclusion. Answer to the task: • 24 = 2³ · 3, 36 = 2² · 3², 60 = 2² · 3 · 5. GCD = 2² · 3 = 12; LCM = 2³ · 3² · 5 = 360. • 24 · 36 · 60 = 51,840, while gcd · lcm = 12 · 360 = 4,320. They are not equal, so the two-number product relation does not extend to three numbers. Figure 8. Extending the GCD and LCM to three numbers by prime factorization. Note: The three-number case goes beyond the two-integer scope of this lesson and previews later number theory. The GCD and LCM methods extend, but the product relation does not. |

-----

| III. CONTENT | Lesson 3.4. Solving Linear Diophantine Equations | Using the Euclidean Algorithm |
|---|---|---|
| IV. OBJECTIVES | At the end of the lesson, the learners are will be able to: 1. define a linear Diophantine equation in two variables as ax + by = 2. examine cases of ax + by = c with given a, b, c to determine when exist if and only if gcd(a, b) divides c; 3. apply the extended Euclidean algorithm to express gcd(a, b) as an 4. solve linear Diophantine equations by scaling the linear combination 5. generate the general solution of a linear Diophantine equation from 6. solve real-world problems modeled by linear Diophantine equations | c with integer solutions sought; integer solutions exist; state the existence condition: solutions integer linear combination of a and b; obtained from the extended Euclidean algorithm. a particular solution; and (e.g., coin combinations, scheduling, packaging). |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Packing Identical Kits Scenario: A school will pack 60 markers and 36 crayons into identical supply kits with nothing left over. |  |

**Instructions: Recall the Euclidean algorithm from the previous lesson,**

then work with a partner.

1. Find gcd(60, 36) using the Euclidean algorithm. Show each division 2. State the greatest number of identical kits that can be formed.

3. State the number of markers and crayons in each kit.

#### 4. Verify your answer using divisibility.

###### Processing Questions

1. What does the GCD represent in this situation? 2. Why does the GCD give exact grouping with nothing left over?

3. How did the division steps lead to the GCD?

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness Overview: Learners recall the Euclidean algorithm for the

GCD, the skill this lesson extends. The packing context revives the link between the GCD and exact whole-number conditions, which the lesson formalizes as integer solutions of an equation.

**Facilitation strategy: Have learners write each division line**

in full, then read the last nonzero remainder as the GCD. Ask what the GCD counts in the kit context before moving on.

###### Procedure for the teacher:

1. Review the Euclidean algorithm with one quick example. 2. Have learners run the algorithm on 60 and 36 and read

3. Tie the GCD to the kit count and the contents per kit.

###### Answer to the task:

#### • 60 = 36 · 1 + 24, then 36 = 24 · 1 + 12, then 24 = 12 · 2 +

0. The last nonzero remainder is 12, so gcd(60, 36) = 12.

#### • The kits number 12. Each kit holds 60 ÷ 12 = 5 markers

and 36 ÷ 12 = 3 crayons. Check: 12 · 5 = 60 and 12 · 3 = 36.

-----

![](img_p148_1.png)

*Figure 1. The Euclidean algorithm gives gcd(60, 36) = 12, the* number of identical kits.

###### Facilitating Reflection:

**PQ1. Intent: read the GCD in context. Answer: The GCD is the greatest kit count that divides both**

totals exactly, so it is the number of identical kits.

**PQ2. Intent: connect the GCD to exact grouping. Answer: Because the GCD divides both 60 and 36, splitting**

each total into that many equal parts leaves no remainder.

**PQ3. Intent: name the method. Answer: Each step replaces the larger number by the remainder**

of dividing it by the smaller, until the remainder is 0; the last nonzero remainder is the GCD.

###### A.2. Establishing the Purpose of the Lesson

**Activity A.2. Appreciating Lesson Relevance Activity A.2. Appreciating Lesson Relevance**

###### Spending an Exact Amount

###### Scenario: A booth sells items at P3 each and other items at P5 each. A

customer spends exactly P30. Let x be the number of P3 items and y the number of P5 items. Find whole-number combinations of x and y that spend exactly P30. Organize your combinations and represent the situation with one equation.

###### Overview: This phase sets the purpose. One spending

scenario shows that some situations call for whole-number combinations that satisfy a single equation. It motivates the lesson without teaching the method.

**Facilitation strategy: Let learners find combinations by trial,**

then ask how the work would change if the total were P3,000 instead of P30, or if the prices did not fit the total. The slowness of trial and the chance of no solution motivate a method.

-----

![](img_p149_1.png)

*Figure 2. Whole-number combinations that satisfy 3x + 5y = 30.*

Trial works here because the total is small. The lesson builds a method that also handles large totals and tells in advance when no combination is possible.

###### Processing Questions

#### 1. What single equation represents the situation? 2. Why must x and y be whole numbers here, not fractions?

###### B. Instituting B.1. Presenting Examples

###### New Activity B.1. Exploring Key Concepts

###### Knowledge When Do Integer Solutions Exist?

Study the four equations. They share the same kind of left side but differ in the constant term. Find what decides whether integer solutions exist.

**Instructions: For each equation, complete the table.**

1. Find gcd(a, b), the GCD of the two coefficients. 2. Check whether that GCD divides the constant term c.

3. Try to find one integer pair (x, y); record whether solutions exist.

| Equation | gcd(a, b) |  |
|---|---|---|
| 2x + 4y = 8 |  |  |
| 2x + 4y = 7 |  |  |
| 3x + 6y = 9 |  |  |
| 5x + 10y = 12 |  |  |

Then state the relationship you see between the GCD and the existence of integer solutions.

**Answer or response to the task: The equation is 3x + 5y =**

30. The whole-number combinations are (10, 0), (5, 3), and (0, 6). Each spends exactly P30. *Note: The scenario is solvable by trial, which is by design. Its* job is to motivate a systematic method, not to introduce it.

###### Facilitating Reflection:

**PQ1. Intent: model the situation. Answer: The cost is 3x + 5y, and it must equal 30, so the**

equation is 3x + 5y = 30.

**PQ2. Intent: surface the integer requirement. Answer: The items are counted one by one, so x and y must be**

whole numbers; a fraction of an item has no meaning here.

###### Activity B.1. Exploring Key Concepts Overview: Through guided discovery, learners compare

examples and non-examples to find the existence condition. The examples and non-examples differ only in the constant term, so the GCD stays fixed while existence flips.

**Strategy, directing attention: Keep the coefficients the same**

within each pair so the GCD does not change. Vary only the constant term. The contrast makes visible that existence depends on whether the GCD divides the constant, not on the size of the numbers.

###### Divides c? Solutions? Procedure for the teacher:

#### 1. Have learners compute the GCD of the coefficients for 2. Have them test whether the GCD divides the constant

each equation.

term.

#### 3. Lead them to state the rule: solutions exist exactly when

the GCD divides the constant.

-----

![](img_p150_1.png)

###### Processing Questions

1. For which equations does the GCD divide the constant term? 2. Which equations have integer solutions, and which do not?

3. What is the same about the equations that have solutions?

#### 4. Complete the rule: ax + by = c has integer solutions exactly when

\_\_\_\_.

###### Answer to the task:

#### • 2x + 4y = 8: gcd 2 divides 8, so solutions exist. 2x + 4y = • 3x + 6y = 9: gcd 3 divides 9, so solutions exist. 5x + 10y =

7: gcd 2 does not divide 7, so none.

12: gcd 5 does not divide 12, so none.

#### • Rule: ax + by = c has integer solutions exactly when

gcd(a, b) divides c.

*Figure 3. Integer solutions exist exactly when the GCD of the* coefficients divides the constant term.

###### Facilitating Reflection:

**PQ1. Intent: apply the divisibility test. Answer: The GCD divides the constant for 2x + 4y = 8 and for**

3x + 6y = 9.

**PQ2. Intent: link the test to existence. Answer: Those two equations have integer solutions. 2x + 4y =**

7 and 5x + 10y = 12 do not.

**PQ3. Intent: name the invariant feature. Answer: In every equation that has solutions, the GCD of the**

coefficients divides the constant term.

**PQ4. Intent: state the rule. Answer: ax + by = c has integer solutions exactly when gcd(a,**

b) divides c.

-----

| B.2. Discussing the Concept |  |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Linear Diophantine Equations and How to Solve Them In A.2 you found whole-number combinations by trial, and in B.1 you found when such combinations exist. This phase names the idea and builds a method that works for any size of numbers. Definition. A linear Diophantine equation in two variables has the form ax + by = c, where a, b, and c are integers and we seek integer values of x and y. A solution is an integer pair (x, y) that makes the equation true. Existence condition. ax + by = c has integer solutions if and only if gcd(a, b) divides c. In symbols, the phrase "if and only if" is written with the two-way arrow ⇔, so the rule reads ax + by = c is solvable ⇔ gcd(a, b) \| c. Example. 6x + 10y = 14 has gcd 2, and 2 divides 14, so solutions exist. 6x + 10y = 15 has gcd 2, and 2 does not divide 15, so it has none. Figure 4. The existence condition, with one equation that has solutions and one that has none. The extended Euclidean algorithm. Run the Euclidean algorithm, then work backward to write the GCD as a combination gcd(a, b) = a · m + b · n for some integers m and n. From the combination to a solution. If the GCD divides c, multiply the combination by c ÷ gcd to scale it into a particular solution. Then the general solution adds the same step over and over: x = x0 + (b ÷ d) t, y = y0 - (a ÷ d) t, where d = gcd(a, b) and t is any integer. A way to picture it. The solutions sit like evenly spaced stops on a line. From any one solution, the same fixed step, adding b ÷ gcd to x and subtracting a ÷ gcd from y, lands on the next stop. | Activity B.2. Deepening Conceptual Understanding Big ideas: Existence is a divisibility condition on the GCD. The extended Euclidean algorithm turns the GCD into a linear combination of the coefficients. One particular solution generates all solutions through the general form. Strategy, definitional strand: Make clear that only integer pairs count. The real-number graph of ax + by = c is a line with infinitely many points, but the Diophantine question keeps only the integer points on that line. Strategy, relational strand: Tie existence to the GCD and tie the family of solutions to the general form. Use the contrast 6x + 10y = 14 against 6x + 10y = 15 so existence turns on divisibility, not on size. Strategy, procedural strand: Walk through the extended Euclidean algorithm and the scaling step slowly. Insist on the existence check first, then back-substitution, then scaling by c ÷ gcd, then the general form. Answer to the task posed: For 20x + 35y = 15: gcd 5 divides 15; 5 = 2(20) - 1(35); scaling by 3 gives the particular solution (6, -3); the general solution is x = 6 + 7t, y = -3 - 4t. Check: 20(6 + 7t) + 35(-3 - 4t) = 15 for every t. Facilitating Reflection: PQ1. Intent: justify the existence check. Answer: If the GCD does not divide c, no integer combination of a and b can equal c, so there is no point in solving. PQ2. Intent: correct the scaling factor. Answer: The combination equals the GCD, so to reach c you multiply by c ÷ gcd. Multiplying by c would overshoot unless the GCD were 1. PQ3. Intent: generate all solutions. Answer: Adding b ÷ gcd to x and subtracting a ÷ gcd from y keeps the left side equal to c, so each integer t gives another solution. |

![](img_p151_1.png)

-----

| Worked example. Solve 20x + 35y = 15. 1. gcd(20, 35) = 5 by the Euclidean algorithm, and 5 divides 15, so solutions exist. 2. Back-substitution gives 5 = 2(20) - 1(35). 3. Multiply by 15 ÷ 5 = 3: 15 = 6(20) - 3(35), so one particular solution is (6, -3). 4. General solution: x = 6 + 7t and y = -3 - 4t for every integer t. Figure 5. Solving 20x + 35y = 15 from the GCD to a particular solution to the general solution. Why infinitely many. Each integer t gives a different solution, and every solution arises from some t, so a solvable equation has infinitely many integer solutions. Processing Questions 1. Why must you check that the GCD divides c before solving? 2. Why do you multiply the combination by c ÷ gcd rather than by c? 3. How does one particular solution lead to all the others? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are on the | Learning Activity Sheet.) |
| Activity B.3. Practicing Overview: The set moves from the existence check alone to the full method. same, so learners practice a stable procedure on varied numbers. Strategy, guided then independent: Work Part 1 together to isolate the their own. Require an existence check before any solving. | Learned Skills Coefficients change from item to item, but the steps stay the existence test, then let learners run the full method in Part 2 on |

-----

|  | Answer to the task: • Part 1. 8x + 12y = 20: gcd 4 divides 20, solutions exist. 6x + 10y = 15: 12, solutions exist. • Part 2 (a). 14x + 22y = 10: gcd 2 divides 10. 2 = -3(14) + 2(22); scale -15 + 11t, y = 10 - 7t. • Part 2 (b). 27x + 45y = 18: gcd 9 divides 18. 9 = 2(27) - 1(45); scale by 5t, y = -2 - 3t. Facilitating Reflection: PQ1. Intent: existence without solving. Answer: Compute the GCD of the coefficients and test whether it divides PQ2. Intent: back-substitution to a solution. Answer: Back-substitution writes the GCD as a combination of the solution. PQ3. Intent: build the general solution. Answer: Add b ÷ gcd to x and subtract a ÷ gcd from y, with a free integer t, PQ4. Intent: verification. Answer: Substitute the pair into ax + by and confirm it equals c. | gcd 2 does not divide 15, none. 9x + 15y = 12: gcd 3 divides by 5 to get the particular solution (-15, 10); general solution x = 2 to get the particular solution (4, -2); general solution x = 4 + the constant term. coefficients; scaling that combination by c ÷ gcd gives a particular to list all solutions. |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Two Spending Plans Model each situation with a linear Diophantine equation, decide whether whole-number plans exist, and report the result. Situation 1, snack budget. A club buys snacks at P3 each and juice at P8 each, spending exactly P30. Let x be the snacks and y the juice. 1. Write the equation and identify a, b, and c. 2. Decide whether whole-number plans exist. 3. Give one practical plan with no negative counts, and verify it. Situation 2, exact fare. Rides cost P4 and P6. A group wants to spend exactly P25. Let x and y be the two ride counts. Write the equation and decide whether any whole-number plan can spend exactly P25. Processing Questions: 1. What equation models Situation 1, and why must the answers be whole numbers? 2. Which practical plans spend exactly P30 in Situation 1? 3. Why is the exact P25 in Situation 2 impossible? | Activity C.1. Making Real-World Connections Overview: Learners carry the method into authentic budget problems. One situation has solutions and yields practical plans; the other has none, which shows the existence condition at work in context. Strategy, the modeling cycle: Move from words to equation, solve, then read the answer back into the situation. Discuss the assumptions: counts are whole numbers and cannot be negative, and the total must be met exactly. A general solution can give negative counts, which the context rules out. Procedure for the teacher: 1. Have learners translate each situation into ax + by = c. 2. For Situation 1, find the general solution, then choose t so both counts are zero or more. 3. For Situation 2, apply the existence test before any solving. Answer to the task: • Situation 1: 3x + 8y = 30. gcd(3, 8) = 1 divides 30, so plans exist. The general solution is x = 2 + 8t, y = 3 - 3t. Practical plans with no negative counts are (2, 3) and (10, 0). Check (2, 3): 3(2) + 8(3) = 30. |

-----

![](img_p154_1.png)

###### C.2. Making Generalization

###### Activity C.2. Wrapping up the Lesson

###### Summing Up the Method Task 1, complete the statements.

1. A linear Diophantine equation in two variables has the form ____. 2. Integer solutions exist exactly when ____.

3. The extended Euclidean algorithm expresses the GCD as \_\_\_\_.

#### 4. A particular solution is scaled from the combination by multiplying 5. The general solution represents ____.

by \_\_\_\_.

**Task 2, order the steps.**

Number the steps from 1 to 5 in the order you would carry them out.

#### • Situation 2: 4x + 6y = 25. gcd(4, 6) = 2 does not divide 25,

so no whole-number plan spends exactly P25.

*Figure 6. The snack budget 3x + 8y = 30 has whole-number* plans; two are practical.

###### Facilitating Reflection:

**PQ1. Intent: model and justify integers. Answer: 3x + 8y = 30; the counts are whole items, so x and y**

must be whole numbers.

**PQ2. Intent: select practical plans. Answer: (2, 3) and (10, 0) both spend exactly P30 and use no**

negative counts.

**PQ3. Intent: read the existence condition in context. Answer: Every combination of P4 and P6 is a multiple of 2, but**

25 is odd, so no plan can total exactly P25.

###### Activity C.2. Wrapping up the Lesson Target conclusion: A linear Diophantine equation ax + by = c

has integer solutions exactly when gcd(a, b) divides c. The extended Euclidean algorithm writes the GCD as a · m + b · n; scaling by c ÷ gcd gives a particular solution; and the general solution x = x0 + (b ÷ d) t, y = y0 - (a ÷ d) t lists all solutions as t ranges over the integers, where d = gcd(a, b).

**Strategy, eliciting and fallback: Eliciting prompt: ask**

learners to state the existence rule and the five steps in order. Fallback prompt: if they stall, ask what must be true for a solution to exist, then ask how one solution leads to the rest.

-----

**Order of steps (answer): Find the GCD; check whether it**

1. Write the general solution. divides the constant; express the GCD as a combination; scale to a particular solution; write the general solution.

#### 2. Find one particular solution by scaling.

###### Answer to Task 1: ax + by = c with integers a, b, c; gcd(a, b)

3. Check whether the GCD divides the constant term. 4. Express the GCD as a combination using back-substitution. equation.

5. Find the GCD of the coefficients. **Facilitating Reflection:**

**PQ1. Intent: state the existence rule.**

![](img_p155_1.png)

###### Answer: ax + by = c has integer solutions exactly when gcd(a,

b) divides c.

**PQ2. Intent: justify infinitely many. Answer: From one solution, adding b ÷ gcd to x and subtracting**

a ÷ gcd from y gives another, and this repeats for every integer t.

**PQ3. Intent: mark the boundary. Answer: When gcd(a, b) does not divide c, as in 6x + 10y = 15,**

there is no integer solution.

| Figure 7. The form, the existence condition, and the steps that generate every solution. Processing Questions 1. In one sentence, when does ax + by = c have integer solutions? 2. Why does a solvable equation have infinitely many integer solutions? 3. When does ax + by = c have no integer solution? |  |
|---|---|
| C.3. Evaluating Learning (Complete instructions for learners are on | the Learning Activity Sheet.) |
| Activity C.3. Assessing Answer Key: Part I (Multiple Choice) 1. B. 4x + 7y = 10 is linear in two variables with integer solutions | Learning Outcomes sought. |

-----

| 2. B. Solutions exist exactly when gcd(a, b) divides c. 3. C. 8x + 12y = 14: gcd 4 does not divide 14, so no integer solution. The others pass the test. 4. B. It expresses the GCD as a linear combination of a and b. 5. C. One solution generates infinitely many. 6. A. a = 6, b = 9, gcd 3, so x = 2 + (9 ÷ 3)t = 2 + 3t and y = 1 - (6 ÷ 3)t = 1 - 2t. Part II (Constructed Response) 1. gcd(9, 15) = 3 and 3 divides 21, so solutions exist. Back-substitution gives 3 = 2(9) - 1(15); scaling by 7 gives the particular solution (14, -7). General solution: x = 14 + 5t, y = -7 - 3t. Any equivalent particular solution is acceptable, such as (-1, 2) at t = -3. 2. 30x + 20y = 180. gcd(30, 20) = 10 divides 180, so combinations exist. Whole-number combinations include (0, 9), (2, 6), (4, 3), and (6, 0); any two are acceptable, for example (2, 6) and (4, 3). Part III (True or False with Reasoning) 1. False. A solution exists only when gcd(a, b) divides c. 2. True. Since 1 divides every integer, the condition always holds. 3. True. The general solution gives one for each integer t. 4. True. This is exactly what the extended Euclidean algorithm produces. 5. False. You multiply by c ÷ gcd, not by c, and only when the GCD divides c. Rubric for the constructed-response items (Part II): • Item 1, 4 points: 1 for the existence check, 1 for a correct combination from back-substitution, 1 for a valid particular solution, 1 for a correct general solution. • Item 2, 4 points: 1 for the correct equation, 1 for the existence check, 2 for two correct whole-number combinations. Scoring approach and total points: Part I, 1 point each, 6 points. Part II, up to 4 points each, 8 points. Part III, 1 point for the correct True or False and 1 for sound reasoning, 2 points each, 10 points. Total: 24 points. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning For Remediation Purpose: This activity rebuilds the full method on a budget problem with small steps for learners who need more practice. Facilitation strategy: 1. Have learners write the equation, then check existence before solving. 2. Guide them to one combination and confirm it by substitution. Answer to the task: • 35x + 25y = 700. gcd(35, 25) = 5 divides 700, so plans exist. Simplify to 7x + 5y = 140. One combination is (20, 0), since 7(20) = 140; another is (0, 28). Check (20, 0): 35(20) + 25(0) = 700. Possible misconception: Learners may skip the existence check or stop at the simplified equation without giving a whole-number plan. Require both the check and a verified combination. |

-----

###### For Enhancement

**Purpose: This activity asks learners to generate the full solution family, bound it to nonnegative plans, and reason about how many plans**

exist.

###### Facilitation strategy:

1. Have learners simplify the equation and write the general solution.

2. Have them find the range of t that keeps both counts zero or more, then count the plans.

#### 3. Ask each team to defend a choice on grounds such as balance or variety.

###### Answer to the task:

• 80x + 50y = 6000. gcd(80, 50) = 10 divides 6000, so plans exist. Simplify to 8x + 5y = 600. General solution: x = 5t, y = 120 - 8t.

- Nonnegative plans need t from 0 to 15, which gives 16 plans. Samples: (0, 120), (25, 80), (50, 40), and (75, 0). A balanced choice

such as (25, 80) or (50, 40) is defensible; the choice is the point of the task.

![](img_p157_1.png)

|  | Figure 8. The seminar budget 80x + 50y = 6000 has 16 whole-number plans; four are shown. Facilitating Reflection: PQ1. Intent: explain the bounded count. Answer: Both counts must be zero or more, so t runs only from 0 to 15. That bounded range gives 16 plans, not unlimited ones. PQ2. Intent: defend a choice. Answer: Any nonnegative plan is valid. A balanced plan such as (25, 80) or (50, 40) is defensible; the reasoning matters more than the specific pick. |
|---|---|
| III. CONTENT | Lesson 3.5. Congruence Modulo m: Properties and Modular Arithmetic Operations |
| IV. OBJECTIVES | At the end of the lesson, the learners are able to: 1. examine remainders of integers under division by a fixed positive integer m to identify equivalence classes; 2. define congruence modulo m: a ≡ b (mod m) if and only if m \| (a - b); 3. illustrate congruence modulo m using cyclic systems (clocks, days of the week, calendar); 4. investigate basic properties of congruence: reflexive, symmetric, transitive; congruence preserved under addition, subtraction, and multiplication; |

-----

|  | 5. justify properties of congruence using the definition; 6. perform addition, subtraction, and multiplication of integers 7. compute modular powers of integers using repeated squaring. | modulo m; and |
|---|---|---|
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learner Readiness Sorting by Remainder Numbers: 7, 12, 9, 20, 14, 5, 18, 23, 11, 6. Instructions: Work with a partner. 1. Divide each number by 5 and record the remainder. 2. Sort the numbers into families by their remainder. 3. Describe what the numbers in one family have in common. Processing Questions: 1. What remainders are possible when you divide by 5? 2. What do the numbers in the same family share? 3. Pick two numbers from one family. What do you notice about their difference? |  |

###### ANNOTATION

###### Activity A.1. Leveling Learner Readiness Overview: Learners recall division with remainder and sort

numbers by their remainder. This revives the idea of grouping by remainder, which the lesson formalizes as congruence and equivalence classes.

**Facilitation strategy: Have learners write each division as a**

remainder, then build the families. Ask what stays the same inside a family before naming the idea.

###### Procedure for the teacher:

1. Review that dividing by 5 leaves a remainder from 0 to 4. 2. Have learners sort the numbers into the five families.

3. Draw out that numbers in one family differ by a multiple of 5.

###### Answer to the task:

#### • Remainder 0: 5, 20. Remainder 1: 6, 11. Remainder 2: 7, 12. • Numbers in a family leave the same remainder and differ by a

Remainder 3: 18, 23. Remainder 4: 9, 14.

multiple of 5, for example 20 - 5 = 15.

-----

![](img_p159_1.png)

| A.2. Establishing the Purpose of the Lesson | Figure 1. Sorting the numbers by their remainder when divided by 5 gives five families. Facilitating Reflection: PQ1. Intent: bound the remainder. Answer: The possible remainders are 0, 1, 2, 3, and 4. PQ2. Intent: name the shared feature. Answer: They leave the same remainder when divided by 5. PQ3. Intent: surface the divisibility link. Answer: Their difference is a multiple of 5, which is the seed of the congruence definition in B.2. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance The Locked Clock Scenario: A box opens only at the right time. The clue says the clock now shows 4:00 and the unlock time is 15 hours later on a 12-hour clock. Student A answers 19:00. Student B answers 7:00. Decide who is correct and explain why. Figure 2. On a 12-hour clock, 15 hours after 4:00 lands on 7:00 because 19 mod 12 = 7. Processing Questions 1. What repeating pattern does the clock follow? | Activity A.2. Appreciating Lesson Relevance Overview: This phase sets the purpose. A clock wraps around every 12 hours, so the hour is found by a remainder. The scene motivates the lesson without naming congruence yet. Facilitation strategy: Let learners reason from the clock face, then ask what happens past 12. Lead them to see that 19 and 7 mark the same spot because they differ by 12. Answer or response to the task: Student B is correct. 4 + 15 = 19, and on a 12-hour clock the hour is 19 mod 12 = 7, so the clock shows 7:00. 19:00 is a 24-hour reading, not a 12-hour clock face. Note: The scene is solvable by counting around the dial. Its job is to motivate the modular idea, not to teach the notation. Possible misconception or weak link: Learners may mix the 12- hour clock face with 24-hour time. Stress that on the 12-hour face the count restarts at 12, so 19 and 7 are the same position. Facilitating Reflection: PQ1. Intent: name the cycle. Answer: The clock repeats every 12 hours, so the hours cycle 1 through 12 and start over. PQ2. Intent: use the remainder. Answer: Counting 15 hours past 4 reaches 19, and 19 mod 12 = 7, so the clock shows 7:00. |

-----

#### 2. How did you decide between 19:00 and 7:00?

###### B. Instituting B.1. Presenting Examples

###### New Activity B.1. Exploring Key Concepts Knowledge When Do Two Numbers Behave the Same? Numbers: 2, 4, 6, 7, 9, 10, 12, 14, 15, 17, 18, 20.

**Instructions: Work toward a rule for when two numbers belong**

together.

#### 1. Divide each number by 4 and sort the numbers into families by 2. Choose two numbers from the same family and find their

their remainder.

difference. Repeat for another pair.

#### 3. Choose two numbers from different families and find their 4. State a rule that decides when two numbers are in the same

difference.

family.

###### Processing Questions:

1. What do the differences of same-family pairs have in common? 2. How is a different-family pair different in this respect?

3. Complete the rule: two numbers share a family modulo 4

exactly when \_\_\_\_.

###### Activity B.1:.Exploring Key Concepts Overview: Through guided discovery, learners compare same-

family and different-family pairs to find that family membership is decided by divisibility of the difference. The examples and nonexamples differ only in whether the difference is a multiple of 4.

**Strategy, directing attention: Keep the modulus fixed at 4 and**

steer attention to the differences. Same-family differences are multiples of 4; different-family differences are not. The contrast exposes the rule.

###### Procedure for the teacher:

1. Have learners sort the numbers into families modulo 4. 2. Have them compute differences within and across families.

3. Lead them to state the rule: two numbers share a family

exactly when 4 divides their difference.

###### Answer to the task:

#### • Families modulo 4: remainder 0 is 4, 12, 20; remainder 1 is 9, • Same family: 14 - 6 = 8 and 4 | 8. Different family: 7 - 6 = 1

17; remainder 2 is 2, 6, 10, 14, 18; remainder 3 is 7, 15.

and 4 does not divide 1.

#### • Rule: two numbers share a family modulo 4 exactly when 4

divides their difference.

![](img_p160_1.png)

-----

| B.2. Discussing the Concept | Figure 3. Two numbers share a family exactly when their difference is divisible by the modulus. Facilitating Reflection: PQ1. Intent: spot the invariant. Answer: Each same-family difference is a multiple of 4. PQ2. Intent: contrast the non-example. Answer: A different-family difference is not a multiple of 4. PQ3. Intent: state the rule. Answer: Two numbers share a family modulo 4 exactly when 4 divides their difference. |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Congruence Modulo m and Modular Arithmetic In A.1 you sorted numbers by remainder, and in A.2 the clock wrapped around. This phase names that idea and builds the arithmetic that goes with it. Division with remainder. For an integer a and a positive integer m, there are unique integers q and r with a = mq + r and 0 ≤ r < m. The remainder r is what a leaves modulo m. For example, 23 = 4 · 5 + 3, so 23 leaves 3 modulo 4. Definition. For a positive integer m, a ≡ b (mod m) means m \| (a - b). Equivalently, a and b leave the same remainder modulo m, and equivalently a = b + m·k for some integer k. | Activity B.2. Deepening Conceptual Understanding Big ideas: Congruence groups integers by remainder. The same divisibility definition drives the properties and lets you reduce before computing. Repeated squaring makes high powers cheap. Strategy, definitional strand: Hold the three readings of a ≡ b (mod m) together: same remainder, m divides the difference, and a = b + m·k. Move between them so learners see they say one thing. Strategy, relational strand: Tie the clock and the days of the week to congruence, and justify each property from the definition rather than from examples alone. Strategy, procedural strand: Drill the reduce-then-operate habit and the squaring steps. Insist on reducing to a remainder from 0 to m - 1 at every stage. Answer to the task posed: (17 + 25) mod 6 = 0; (8 · 5) mod 6 = 4; 3 to the 13th power modulo 7 is 3. Facilitating Reflection: PQ1. Intent: link remainder and divisibility. Answer: If a and b share a remainder, their difference is a multiple of m, so m divides a - b; the reverse holds too. PQ2. Intent: justify reducing first. Answer: Congruence is preserved under multiplication, so replacing each number by its remainder does not change the product modulo m. PQ3. Intent: see the efficiency. Answer: Squaring reaches high exponents in a few steps, while multiplying the base repeats many times. |

-----

![](img_p162_1.png)

*Figure 4. Three equivalent ways to read a ≡ b (mod m).*

**Equivalence classes. All integers with the same remainder modulo**

m form one class. Modulo 4 there are four classes, one for each remainder 0, 1, 2, 3. A cyclic system such as a clock or the days of the week is one of these classes in action.

**A way to picture it. Think of modulo m as a wheel with m marks**

numbered 0 to m - 1. Counting forward moves around the wheel, and passing the last mark returns to 0, the way a clock returns to 12.

**Properties. Congruence is reflexive, since m | 0 gives a ≡ a. It is**

symmetric, since m | (a - b) gives m | (b - a). It is transitive, since adding (a - b) and (b - c) shows m | (a - c). Each one follows from the definition

![](img_p162_2.png)

*Figure 5. The reflexive, symmetric, and transitive properties follow* from the definition.

**Congruence and operations. If a ≡ b (mod m) and c ≡ d (mod m),**

then a + c ≡ b + d (mod m), a - c ≡ b - d (mod m), and a·c ≡ b·d (mod m). So you may reduce each number to its remainder first, then add, subtract, or multiply.

-----

###### Worked example. (17 + 25) mod 6: since 17 ≡ 5 and 25 ≡ 1, the sum

is 5 + 1 = 6 ≡ 0 (mod 6). (8 · 5) mod 6: since 8 ≡ 2, the product is 2 · 5 = 10 ≡ 4 (mod 6).

![](img_p163_1.png)

*Figure 6. Reduce each number to its remainder first, then add,*

subtract, or multiply.

**Modular powers by repeated squaring. To raise to a high power,**

square step by step and reduce after each step, then combine the squares the exponent needs. For 3 to the 13th power modulo 7, the squares are 3, 2, 4, 2; since 13 = 8 + 4 + 1, the result is 2 · 4 · 3 = 24 ≡ 3 (mod 7).

![](img_p163_2.png)

-----

| Figure 7. Repeated squaring finds 3 to the 13th power modulo 7 in a few steps. Processing Questions 1. Why do a and b have the same remainder exactly when m divides a - b? 2. Why may you reduce numbers to their remainders before multiplying? 3. Why is repeated squaring faster than multiplying the base over and over? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Overview: The set moves from verifying congruence to operating modulo item to item, but the method stays the same. Strategy, guided then independent: Work Part 1 together to fix the Require a reduction to a least residue at each step. | Learned Skills m, then to powers and properties. The modulus changes from divisibility test, then let learners run Parts 2 to 4 on their own. |

###### Answer to the task:

• Part 1. 38 ≡ 14 (mod 6): true, since 6 | 24. 50 ≡ 27 (mod 8): false, since 8 does not divide 23. 41 ≡ 13 (mod 7): true, since 7 | 28.

- Part 2. (29 + 18) mod 7 = 1 + 4 = 5. (34 · 23) mod 5 = 4 · 3 = 12 ≡ 2. (56 - 39) mod 9 = 2 - 3 = -1 ≡ 8.

• Part 3. 2 to the 20th power modulo 7: squares 2, 4, 2, 4, 2; since 20 = 16 + 4, the result is 2 · 2 = 4. 3 to the 10th power modulo 1 1:

- Part 4. Reflexive; symmetric; transitive.

###### Facilitating Reflection:

**PQ1. Intent: use the difference test.** **Answer: Subtract the two numbers and check whether the modulus divides the difference.** **PQ2. Intent: value of reducing first.** **Answer: Replacing each number by its small residue keeps sums and products easy to handle.** **PQ3. Intent: assemble a power.** **Answer: Write the exponent as a sum of powers of two, then multiply the matching squares.** **C.** ***C.1. Finding Practical Application*** **Demonstrating Activity C.1. Making Real-World Connections Activity C.1. Making Real-World Connections** **Knowledge**

| and Skills | Planning with Cycles | Overview: Learners apply congruence to authentic cycles. The day |
|---|---|---|
|  | Each situation repeats on a fixed cycle. Use congruence to find the | of the week repeats every 7, and the clock every 24, so the position |
|  | position after a large count. | after a long count is a remainder. |

**Strategy, the modeling cycle: Name the cycle length as the**

modulus, reduce the count modulo that number, then read off the

-----

| Situation 1, duty by the day. A clinic rotates duty by the day of the week. If today is Wednesday, what day will it be 100 days from now? Use congruence modulo 7. Situation 2, the 24-hour clock. A delivery service reads time on a 24-hour clock. What time will it be 100 hours after 09:00? Use congruence modulo 24. Processing Questions: 1. What is the cycle length in each situation, and where does it come from? 2. How does reducing the count modulo the cycle give the answer? 3. What does the model assume about the cycle? | position. Have learners state the assumption that the cycle runs without a break. Answer to the task: • Situation 1: 100 mod 7 = 2, so the day is two past Wednesday, which is Friday. • Situation 2: 100 mod 24 = 4, so the time is 09:00 + 4 = 13:00. Facilitating Reflection: PQ1. Intent: identify the modulus. Answer: Seven for the days of the week and 24 for the clock; the cycle length is the modulus. PQ2. Intent: use the remainder. Answer: The remainder of the count modulo the cycle gives how far past the start the position lands. PQ3. Intent: state the assumption. Answer: It assumes the cycle repeats without interruption. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson What We Know About Congruence Task: Complete each statement in your own words. 1. a ≡ b (mod m) exactly when ____ divides ____. 2. To operate modulo m, first ____, then add, subtract, or multiply. 3. To compute a large power modulo m, use ____. | Activity C.2. Wrapping up the Lesson Target conclusion: a ≡ b (mod m) means m divides a - b, equivalently a and b share a remainder. Congruence is reflexive, symmetric, and transitive, and is preserved under addition, subtraction, and multiplication, so you reduce first and then operate. High powers are found by repeated squaring. Strategy, eliciting and fallback: Ask learners to state the definition in their own words. If a statement is partial, prompt with a specific case such as 17 and 5 modulo 6 to anchor the idea. Answer to Task: First blank: m divides a - b. Second blank: reduce each number to its remainder. Third blank: repeated squaring. Facilitating Reflection: PQ1. Intent: state the rule. Answer: a ≡ b (mod m) means the modulus divides the difference a - b. PQ2. Intent: mark the boundary. Answer: It is false when m does not divide a - b, that is, when a and b leave different remainders, as with 17 and 5 modulo 5. |

![](img_p165_1.png)

-----

| Figure 8. A summary of congruence modulo m: meaning, families, properties, operations, and powers. Processing Questions: 1. State the meaning of a ≡ b (mod m) in one sentence. 2. When is a ≡ b (mod m) false? |  |
|---|---|
| C.3. Evaluating Learning (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity C.3. Assessing Answer Key, Part I (Multiple Choice) 1. A. 23 - 5 = 18 and 6 \| 18, so 23 ≡ 5 (mod 6). The others fail the 2. C. 30 mod 7 = 2, so the day is two past Monday, which is 3. B. A number is congruent to itself, which is the reflexive 4. D. 56 ≡ 1 (mod 5) and 7 · 8 ≡ 2 · 3 (mod 5), so both A and C 5. B. 2 squared ≡ 4, 2 to the 4th ≡ 2, 2 to the 8th ≡ 4 (mod 7); since 6. C. Congruence is preserved under addition, subtraction, and Answer Key, Part II (Constructed Response) 1. 14 - 38 = -24, and 6 \| -24, so 14 ≡ 38 (mod 6). This is the symmetric 2. 45 ≡ 5 and 29 ≡ 5 (mod 8). Sum: 5 + 5 = 10 ≡ 2 (mod 8). Product: Rubric for the constructed-response items (Part II): 4 points each. correct notation or naming. A bare answer with no work earns at most Answer Key, Part III (True or False with Reasoning) 1. True. m \| 0 always holds, so a ≡ a (mod m). 2. False. Congruent numbers leave the same remainder, not different 3. True. Congruence is preserved under addition. 4. True. If m divides a - b and b - c, it divides a - c. 5. False. Repeated squaring reduces after each step, so the full power Scoring approach and total points: Part I, 6 items at 1 point, is 6. the decision and 1 for the reason, is 10. The total is 24. | Learning Outcomes divisibility test. Wednesday. property. hold. 10 = 8 + 2, the result is 4 · 4 = 16 ≡ 2 (mod 7). multiplication, not division. property. 5 · 5 = 25 ≡ 1 (mod 8). Award 2 for a correct method shown, 1 for a correct result, and 1 for 1. ones. is never needed. Part II, 2 items at 4 points, is 8. Part III, 5 items at 2 points, with 1 for |
| C.4. Additional Activities (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning For Remediation Guided practice. Work modulo 5 with small steps. 1. Find the remainder of 23, 47, and 38 modulo 5. 2. Compute (23 + 47) mod 5 and (23 · 38) mod 5 by reducing first. 3. Let Sunday = 0 through Saturday = 6. If today is Tuesday, find the day 12 days from now using modulo 7. | Activity C.4. Extending and Reinforcing Learning For Remediation Purpose: This rebuilds remainders and modular operations with small numbers for learners who need more practice before moving on. Facilitation strategy: 1. Have learners write each remainder before any operation. |

-----

|  | For Enhancement Units digit of a large power. The units digit of a number is its remainder modulo 10. Use modular arithmetic to find units digits without computing the whole power. 1. Find the units digit of 3 to the 200th power by working modulo 10. 2. Find the units digit of 7 to the 100th power by working modulo 10. 3. Describe the repeating cycle of units digits for each base. Processing Questions 1. Why does working modulo 10 give the units digit? 2. How does a short repeating cycle make a very large power easy? | 2. Guide them to reduce first, then add or multiply. Answer to the task: • Remainders modulo 5: 23 ≡ 3, 47 ≡ 2, 38 ≡ 3. • (23 + 47) mod 5 = 3 + 2 = 5 ≡ 0. (23 · 38) mod 5 = 3 · 3 = 9 ≡ 4. • Days: Tuesday is 2, and 12 mod 7 = 5, so 2 + 5 = 7 ≡ 0, which is Sunday. For Enhancement Purpose: This stretches learners to read a units digit as a remainder modulo 10 and to use a short cycle to settle a very large power. Facilitation strategy: 1. Have learners square modulo 10 until the pattern repeats. 2. Lead them to match the exponent to the cycle length. Answer to the task: • 3 to the 200th power: 3 squared is 9, 3 to the 4th is 81 ≡ 1 (mod 10), so 3 to the 200th is (3 to the 4th) to the 50th ≡ 1. The units digit is 1. • 7 to the 100th power: 7 squared is 49 ≡ 9, 7 to the 4th ≡ 1 (mod 10), so 7 to the 100th ≡ 1. The units digit is 1. • Units digits cycle with length 4: 3 gives 3, 9, 7, 1; 7 gives 7, 9, 3, 1. Facilitating Reflection: PQ1. Intent: link units digit and modulo 10. Answer: The units digit is the remainder when a number is divided by 10, so working modulo 10 isolates it. PQ2. Intent: use the cycle. Answer: Once the digits repeat with a short period, reduce the exponent modulo that period to find the answer at once. Curricular Links: Remediation consolidates Objectives 1, 4, and 6. Enhancement extends Objective 7 to units-digit patterns. Both support the unit goal on modular arithmetic and the Summative items tagged to this lesson, and both rehearse the modular skills the Performance Task draws on. |
|---|---|---|
| III. CONTENT | Lesson 3.6. Solving | Linear Congruences |
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. define a linear congruence as an equation of the form ax ≡ b 2. examine small cases of ax ≡ b (mod m) by testing residues to | (mod m); identify when a solution exists; |

-----

|  | 3. state the existence condition: a linear congruence ax ≡ b (mod 4. investigate cases where solutions exist to observe the number when the existence condition holds; 5. define the modular inverse of a modulo m and identify when 6. compute modular inverses using the extended Euclidean 7. solve linear congruences ax ≡ b (mod m) using the modular 8. solve linear congruences using reduction, dividing through | m) has a solution if and only if gcd(a, m) divides b; of incongruent solutions modulo m, specifically gcd(a, m) solutions it exists, when gcd(a, m) = 1; algorithm; inverse method when gcd(a, m) = 1; and by gcd(a, m), when gcd(a, m) > 1 and divides b. |
|---|---|---|
| V. PROCEDURES | LEARBERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Two Warm-Up Skills Instructions: Work with a partner. 1. Test x = 0, 1, 2, 3, 4 in 3x ≡ 1 (mod 5). Which value works? 2. Find gcd(6, 8) and gcd(4, 9). Processing Questions 1. How many residues do you need to test for a modulus of 5? 2. What does gcd(a, m) measure? 3. Did every value of x you tested satisfy the congruence? |  |

###### ANNOTATION

###### Activity A.1. Leveling Learners Readiness Overview: Learners recall two skills the lesson needs: testing

residues in a congruence, from the previous lesson, and the greatest common divisor, from earlier in the unit. Both feed the rule for solving linear congruences.

**Facilitation strategy: Have learners substitute each residue and**

reduce, then read off which one works. Review that the gcd is the largest divisor shared by two numbers.1

###### Procedure for the teacher:

1. Have learners test x = 0 through 4 in the congruence. 2. Have them compute the two gcd values.

3. Point out that only some residues satisfy the congruence.

###### Answer to the task:

#### • 3x ≡ 1 (mod 5): the residues 3x give 0, 3, 1, 4, 2, so only x = 2 • gcd(6, 8) = 2 and gcd(4, 9) = 1.

works.

![](img_p168_1.png)

-----

| A.2. Establishing the Purpose of the Lesson | Figure 1. Testing residues solves a small congruence, and the gcd is recalled from earlier lessons. Facilitating Reflection: PQ1. Intent: bound the testing. Answer: Only the residues 0 through 4, since every integer is congruent to one of them modulo 5. PQ2. Intent: recall the gcd. Answer: The greatest common divisor is the largest number dividing both a and m. PQ3. Intent: foreshadow existence. Answer: No. Only x = 2 worked, which previews that a linear congruence need not be true for every x. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Counting the Snack Packs Scenario: When the number of snack packs is multiplied by 4 and divided by 9, the remainder is 5. What could the number of packs be? Write the relationship using congruence, then look for values that fit. Figure 2. A grouping-with-leftover situation becomes the linear congruence 4x ≡ 5 (mod 9). | Activity A.2. Appreciating Lesson Relevance Overview: This phase sets the purpose. A grouping situation with a leftover is naturally a linear congruence, and the question asks which values fit, not for a single number. Facilitation strategy: Let learners name the unknown and write 4x ≡ 5 (mod 9). Draw out that several values of x fit, spaced 9 apart, unlike an ordinary equation. Answer or response to the task: The situation is 4x ≡ 5 (mod 9). Testing residues, x = 8 works, since 4 · 8 = 32 ≡ 5 (mod 9). The full set is x = 8, 17, 26, and so on. Note: The scene is solvable by testing. Its job is to motivate the linear-congruence idea, not to teach a method yet. Facilitating Reflection: PQ1. Intent: model the situation. Answer: Four times the number of packs leaves 5 modulo 9, which is 4x ≡ 5 (mod 9). PQ2. Intent: contrast with equations. Answer: An ordinary equation seeks one value, while a congruence accepts every value in a class that fits. |

-----

###### Processing Questions

1. How would you write this situation as a congruence?
2. How is this different from an ordinary equation with one

answer?

| B. Instituting | B.1. Presenting Examples |  |
|---|---|---|
| New Knowledge | Activity B.1. Exploring Key Concepts When Does a Linear Congruence Have a Solution? Test the residues of each congruence and record which values of x work. 1. 9x ≡ 2 (mod 6): test x = 0 through 5. 2. 3x ≡ 2 (mod 5): test x = 0 through 4. 3. 2x ≡ 4 (mod 6): test x = 0 through 5. 4. For each, also compute gcd(a, m) and compare it with b. Processing Questions: 1. Which congruence had no solution, and what was special about its gcd and b? 2. How many solutions did each solvable congruence have? 3. Complete the rule: a linear congruence has a solution exactly when ____. |  |

###### Activity B.1. Exploring Key Concepts Overview: Through guided discovery, learners test residues and

connect solvability to divisibility by gcd(a, m). The examples that have solutions and the one that does not differ only in whether the gcd divides b.

**Strategy, directing attention: Keep attention on gcd(a, m) and b.**

When the gcd divides b, solutions appear, and their count equals the gcd. When it does not, no residue works.

###### Procedure for the teacher:

1. Have learners build the table of residues for each congruence.
2. Have them compute each gcd and test divisibility of b.
3. Lead them to the rule and to the count of solutions.

###### Answer to the task:

- 9x ≡ 2 (mod 6): values are 0, 3 only, never 2; gcd(9, 6) = 3 does

not divide 2, so no solution.

- 3x ≡ 2 (mod 5): x = 4 works; gcd(3, 5) = 1, so one solution.
- 2x ≡ 4 (mod 6): x = 2 and x = 5 work; gcd(2, 6) = 2, so two

solutions.

- Rule: ax ≡ b (mod m) has a solution exactly when gcd(a, m)

divides b, and then there are exactly d = gcd(a, m) incongruent solutions modulo m. The symbol ∤ means does not divide, so gcd(a, m) ∤ b says the gcd does not divide b and the congruence has no solution.

-----

![](img_p171_1.png)

###### B.2. Discussing the Concept

###### Activity B.2. Deepening Conceptual Understanding

###### Solving Linear Congruences

In A.2 a grouping situation became 4x ≡ 5 (mod 9), and in B.1 you found when such a congruence has a solution. This phase names the methods that solve it.

**Definition. A linear congruence in one variable has the form ax ≡ b**

(mod m), where a, b, and m are integers, m is positive, and x is the unknown. Put a congruence in this form before solving, for example 3x - 8 ≡ 10 (mod 11) becomes 3x ≡ 18 (mod 11), then 3x ≡ 7 (mod 11).

**Existence and count. The congruence ax ≡ b (mod m) has a**

solution if and only if gcd(a, m) divides b. When it is solvable, it has exactly gcd(a, m) incongruent solutions modulo m. This is the same

*Figure 3. Testing residues shows that solutions exist exactly when* gcd(a, m) divides b.

###### Facilitating Reflection:

**PQ1. Intent: spot the no-solution case. Answer: 9x ≡ 2 (mod 6) has no solution, because gcd(9, 6) = 3 does**

not divide 2.

**PQ2. Intent: count the solutions. Answer: One when the gcd is 1, and two when the gcd is 2; the count**

equals gcd(a, m).

**PQ3. Intent: state the rule. Answer: A linear congruence has a solution exactly when gcd(a, m)**

divides b.

###### Activity B.2. Deepening Conceptual Understanding

**Big ideas: Solvability is a divisibility test on gcd(a, m). The gcd also**

counts the solutions. Two methods follow: the inverse when the gcd is 1, and reduction when the gcd is larger and divides b.

**Strategy, definitional strand: Insist on standard form ax ≡ b (mod**

m) first, reducing b modulo m. Tie the existence test back to the Diophantine equation so the rule is not a new fact to memorize.

**Strategy, relational strand: Connect the count of solutions to the**

gcd, and the inverse to the case gcd = 1. Show that reduction turns

**Strategy, procedural strand: Drill the inverse method and the**

reduction method, and have learners verify each answer by substitution.

-----

divisibility test as the linear Diophantine equation ax - my = b from **Answer to the task posed: 4x ≡ 5 (mod 9) gives x ≡ 8. 6x ≡ 12 (mod** the previous lesson. 18) gives x ≡ 2 (mod 3), the six residues 2, 5, 8, 11, 14, 17.

![](img_p172_1.png)

###### Facilitating Reflection:

**PQ1. Intent: justify existence. Answer: Because ax - my = b has integer solutions only when gcd(a,**

m) divides b, and that equation is the same as the congruence.

**PQ2. Intent: justify the inverse. Answer: Multiplying a by its inverse gives 1 modulo m, so the left**

side becomes x and the right side becomes the inverse times b.

**PQ3. Intent: justify the count. Answer: The reduced congruence has one solution modulo the**

smaller modulus, which lifts to gcd(a, m) residues modulo the original

*Figure 4. A linear congruence is solvable exactly when gcd(a, m)* m. divides b, with gcd(a, m) solutions.

**Modular inverse. The inverse of a modulo m is the number that**

satisfies a times it ≡ 1 (mod m). It exists exactly when gcd(a, m) = 1, and the extended Euclidean algorithm finds it. It is often written with a raised -1, but here it is called the inverse of a. For example, 4 · 7 ≡ 1 (mod 9), so 7 is the inverse of 4 modulo 9. To find this inverse by the extended Euclidean algorithm, run the Euclidean algorithm and read it backward: 9 = 2 · 4 + 1, so 1 = 9 - 2 · 4. Modulo 9 this gives -2 · 4 ≡ 1, so the inverse of 4 is -2 ≡ 7 (mod 9), the same value found above. The same back-substitution gives an inverse for any a with gcd(a, m) = 1, including moduli too large to guess by inspection.

![](img_p172_2.png)

-----

*Figure 5. The inverse of a modulo m exists when gcd(a, m) = 1 and* satisfies a times it ≡ 1.

**A way to think about it. Multiplying by the inverse of a does the**

work that dividing by a would do in ordinary algebra. Modular arithmetic has no direct division, so the inverse stands in for it.

**Method 1, the inverse (when gcd is 1). Multiply both sides by the**

inverse of a. For 4x ≡ 5 (mod 9), the inverse of 4 is 7, so x ≡ 7 · 5 = 35 ≡ 8 (mod 9).

![](img_p173_1.png)

*Figure 6. When the gcd is 1, multiply both sides by the inverse of a* to isolate x.

###### Method 2, reduction (when gcd exceeds 1 and divides b). Divide

a, b, and m by the gcd, then solve the reduced congruence. For 6x ≡ 12 (mod 18), gcd(6, 18) = 6 divides 12, so dividing by 6 gives x ≡ 2 (mod 3), which lists as six solutions modulo 18: 2, 5, 8, 11, 14, and 17.

-----

![](img_p174_1.png)

| Figure 7. When the gcd exceeds 1 and divides b, divide through by the gcd, then solve. Processing Questions 1. Why does ax ≡ b (mod m) need gcd(a, m) to divide b before it can be solved? 2. Why does multiplying by the inverse of a isolate x? 3. Why does the reduced congruence give gcd(a, m) solutions modulo the original m? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Overview: The set moves from deciding existence to solving by the gcd-first habit stays the same, which is the variation principle behind Strategy, guided then independent: Work Part 1 together to fix the check before any solving and a substitution check after. Answer to the task: • Part 1. 6x ≡ 4 (mod 8): gcd 2 divides 4, two solutions. 9x ≡ 2 (mod divides 15, five solutions. • Part 2. 3x ≡ 5 (mod 7): inverse of 3 is 5, so x ≡ 5 · 5 = 25 ≡ 4 (mod 5x ≡ 3 (mod 26): by the extended Euclidean algorithm, 26 = 5 · 5 ≡ 21, so x ≡ 21 · 3 = 63 ≡ 11 (mod 26). • Part 3. 6x ≡ 18 (mod 24): divide by 6, x ≡ 3 (mod 4), the residues x ≡ 4 (mod 5), the residues 4, 9, 14, 19, 24. Facilitating Reflection: PQ1. Intent: choose the method. Answer: A gcd of 1 calls for the inverse; a larger gcd that divides b calls | Learned Skills inverse and by reduction. The coefficient and modulus change, but the the sequence. existence test, then let learners run Parts 2 and 3. Require a gcd 6): gcd 3 does not divide 2, no solution. 10x ≡ 15 (mod 25): gcd 5 7). 5x ≡ 4 (mod 11): inverse of 5 is 9, so x ≡ 9 · 4 = 36 ≡ 3 (mod 11). + 1, so 1 = 26 - 5 · 5; reading modulo 26 gives the inverse of 5 as -5 3, 7, 11, 15, 19, 23. 10x ≡ 15 (mod 25): divide by 5, 2x ≡ 3 (mod 5), for reduction first. |

-----

| C. Demonstrating Knowledge and Skills | PQ2. Intent: verify. Answer: Substitute the solution back and confirm both sides agree modulo m. PQ3. Intent: connect count and gcd. Answer: The number of solutions equals gcd(a, m), so the gcd told the count in advance. C.1. Finding Practical Application Activity C.1. Making Real-World Connections The Clean-Up Drive Scenario: Volunteers packed garbage bags into bundles of 14. Later the bags were shared equally among 20 trucks, leaving 8 bags. Some organizers said the leftover proves the plan was inefficient; others said the remainder is expected. Model the situation, solve it, and decide what the leftover really shows. 1. Write the linear congruence, with x the number of bundles. 2. Find gcd(a, m) and decide whether the situation is possible. 3. State the number of incongruent solutions, then find them. 4. Decide whether the leftover proves inefficiency, and explain. Processing Questions: 1. What congruence models the situation? 2. How does the gcd settle whether the leftover is possible? 3. What does the result say about the inefficiency claim? | Answer: Substitute the solution back and confirm both sides agree modulo m. Answer: The number of solutions equals gcd(a, m), so the gcd told the count in advance. Activity C.1. Making Real-World Connections Overview: Learners model a grouping-with-leftover situation as a linear congruence, solve it, and interpret the leftover. The context is an authentic distribution problem. Strategy, the modeling cycle: Name the unknown, write the congruence, run the gcd test, solve, then read the answer back into the situation. Have learners state the assumption that bundles and trucks are exact. Answer to the task: • The model is 14x ≡ 8 (mod 20). gcd(14, 20) = 2 divides 8, so the situation is possible. • Two incongruent solutions: divide by 2 to get 7x ≡ 4 (mod 10); the inverse of 7 is 3, so x ≡ 3 · 4 = 12 ≡ 2 (mod 10), giving x = 2 and x = 12 modulo 20. The reduced answer x ≡ 2 (mod 10) corresponds, modulo 20, to the two residue classes x ≡ 2 (mod 20) and x ≡ 12 (mod 20). • The leftover of 8 is consistent with the model, so it does not by itself prove inefficiency. Facilitating Reflection: PQ1. Intent: model. Answer: Fourteen times the number of bundles leaves 8 modulo 20, which is 14x ≡ 8 (mod 20). PQ2. Intent: use the gcd. Answer: gcd(14, 20) = 2 divides 8, so a whole-number count of bundles is possible. PQ3. Intent: interpret. Answer: The leftover fits the model, so it is expected, not proof of an inefficient plan. |
|---|---|---|
|  | C.2. Making Generalization |  |
|  | Activity C.2. Wrapping up the Lesson How We Solve a Linear Congruence Task 1. Complete each statement in your own words. 1. ax ≡ b (mod m) has a solution exactly when ____ divides ____. | Activity C.2. Wrapping up the Lesson Target conclusion: ax ≡ b (mod m) has a solution exactly when gcd(a, m) divides b, and then it has gcd(a, m) incongruent solutions modulo m. If the gcd is 1, multiply by the inverse of a; if the gcd is larger and divides b, reduce first, then solve. |

-----

2. When solvable, the number of incongruent solutions is ____. Strategy, eliciting and fallback: Ask learners to state the

3. If the gcd is 1, solve by \_\_\_\_; if the gcd is larger and divides b, existence rule in their own words. If a statement is partial, prompt

solve by \_\_\_\_. with a specific case such as 6x ≡ 15 (mod 21) to anchor the gcd test.

###### Answer to Task: First statement: gcd(a, m) divides b. Second:

![](img_p176_1.png)

gcd(a, m). Third: the inverse of a; reduction.

###### Facilitating Reflection:

**PQ1. Intent: state the rule. Answer: A linear congruence ax ≡ b (mod m) is solvable exactly when**

gcd(a, m) divides b.

**PQ2. Intent: mark the boundary. Answer: It has no solution when gcd(a, m) does not divide b, as in 9x**

≡ 2 (mod 6).

| Figure 8. A decision path for solving ax ≡ b (mod m), from the gcd test to the right method. Processing Questions 1. State the existence rule for a linear congruence in one sentence. 2. When does a linear congruence have no solution? |  |
|---|---|
| C.3. Evaluating Learning (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity C.3. Assessing Answer Key, Part I (Multiple Choice) 1. C. 3 · 3 = 9 ≡ 4 (mod 5), so x = 3. 2. D. gcd(8, 14) = 2 divides 6, so the congruence has solutions. 3. C. gcd(6, 15) = 3 divides 9, so there are 3 incongruent solutions. 4. D. 3 · 5 = 15 ≡ 1 (mod 7), so the inverse of 3 is 5. 5. B. The inverse of 4 modulo 5 is 4, so x ≡ 4 · 3 = 12 ≡ 2 (mod 5). 6. A. gcd(4, 12) = 4, and dividing through by 4 gives x ≡ 2 (mod 3). Answer Key, Part II (Constructed Response) 1. The inverse of 5 modulo 9 is 2, since 5 · 2 = 10 ≡ 1. So x ≡ 2 · 4 = 2. gcd(9, 15) = 3 divides 12, so there are 3 solutions. Divide by 3 to solutions modulo 15 are 3, 8, and 13. 3. Extended Euclidean: 18 = 3 · 5 + 3; 5 = 1 · 3 + 2; 3 = 1 · 2 + 1. is -7 ≡ 11. Then x ≡ 11 · 4 = 44 ≡ 8 (mod 18). Check: 5 · 8 = 40 ≡ | Learning Outcomes 8 (mod 9). Check: 5 · 8 = 40 ≡ 4 (mod 9). get 3x ≡ 4 (mod 5); the inverse of 3 is 2, so x ≡ 8 ≡ 3 (mod 5). The Back-substitution gives 1 = 2 · 18 - 7 · 5, so the inverse of 5 modulo 18 4 (mod 18). |

-----

| Rubric for the constructed-response items (Part II): 4 points each. Award 2 for a correct method shown, 1 for a correct result, and 1 for correct notation or a verification. A bare answer with no work earns at most 1. Answer Key, Part III (True or False with Reasoning) 1. True. The gcd test is exactly the condition for a solution. 2. True. A gcd of 1 gives exactly one solution modulo m. 3. False. If d = gcd(a, m) does not divide b there are 0 solutions; if d divides b there are exactly d incongruent solutions modulo m. So the count is 0, 1, or more than 1, never a fractional or negative value. 4. False. The inverse exists only when gcd(a, m) = 1. 5. False. If the gcd does not divide b, there is no solution at all. Scoring approach and total points: Part I, 6 items at 1 point, is 6. Part II, 3 items at 4 points, is 12. Part III, 5 items at 2 points, with 1 for the decision and 1 for the reason, is 10. The total is 28. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning |

###### For Remediation

**Purpose: This rebuilds the existence test and the solving methods with small numbers for learners who need more support. Facilitation strategy:**

#### 1. Have learners compute the gcd before solving. 2. Guide them to reduce when the gcd exceeds 1 and divides b.

###### Answer to the task:

• 3x ≡ 6 (mod 9): gcd(3, 9) = 3 divides 6, so there are 3 solutions. Divide by 3 to get x ≡ 2 (mod 3), the residues 2, 5, 8 modulo 9.

- 2x ≡ 3 (mod 4): gcd(2, 4) = 2 does not divide 3, so there is no solution.

###### For Enhancement Purpose: This extends the method to a pouring puzzle, where each fill adds 13 ounces modulo the 20-ounce beaker.

###### Facilitation strategy:

#### 1. Have learners express each 13-ounce fill as adding 13 modulo 20. 2. Lead them to the congruence and the inverse method.

###### Answer to the task:

• The model is 13x ≡ 2 (mod 20). gcd(13, 20) = 1 divides 2, so a solution exists.

- The inverse of 13 modulo 20 is 17, since 13 · 17 = 221 ≡ 1. So x ≡ 17 · 2 = 34 ≡ 14 (mod 20); the least positive number of fills is 14.

###### Facilitating Reflection:

**PQ1. Intent: connect pouring and congruence. Answer: Each fill adds 13 ounces and emptying the large beaker removes 20, so the net amount is 13x modulo 20. PQ2. Intent: use the gcd. Answer: gcd(13, 20) = 1 divides 2, so 2 ounces is reachable.**

-----

| III. CONTENT | Lesson 3.7. Applications of Modular | Arithmetic in Real-World Verification Systems |
|---|---|---|
| IV. OBJECTIVES | By the end of the lesson, the learners are will be able to: 1. examine the structure of UPC-A codes and identify the role 2. verify a given UPC-A code using modular arithmetic and 3. examine the structure of ISBN-10 codes; verify a given ISBN-10 4. examine the structure of ISBN-13 codes; verify a given ISBN-13 5. compare the ISBN-10 and ISBN-13 schemes in terms of 6. examine Luhn's algorithm and use it to verify credit card 7. apply Luhn's algorithm to detect single-digit errors and 8. connect modular arithmetic to error detection in real-world are chosen. | of the check digit; compute the check digit of a partial UPC-A code; and compute its check digit using arithmetic modulo 11; and compute its check digit using arithmetic modulo 10; weighting and modulus; numbers; adjacent transpositions in identification numbers; and identification systems and explain why specific moduli and weights |
| V. PROCEDURES | LEARNERS ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Two Warm-Up Skills Instructions: Work with a partner. 1. Compute the weighted sum 3 · 7 + 1 · 4, then take it modulo 10. 2. Compute 47 modulo 9. Processing Questions 1. In step 1, which numbers did you multiply before adding? 2. What does taking a result modulo 10 give you? 3. How is a weighted sum different from a plain sum? | Activity A.1. Leveling Learners Readiness Overview: Learners recall two skills the lesson needs: forming a weighted sum and reducing modulo a number. Verification systems Facilitation strategy: Have learners multiply each term by its the remainder. 1. Have learners compute the weighted sum and reduce it modulo 10. |

are built on exactly these two steps.

weight, add, then reduce. Stress that the modulo step keeps only

###### Procedure for the teacher:

#### 2. Have them compute the plain remainder modulo 9. 3. Point out that both steps return a remainder.

###### Answer to the task:

#### • 3 · 7 + 1 · 4 = 25, and 25 modulo 10 = 5. • 47 modulo 9 = 2.

-----

![](img_p179_1.png)

| A.2. Establishing the Purpose of the Lesson | Figure 1. A weighted sum reduced modulo 10, and a plain remainder, both from modular arithmetic. Facilitating Reflection: PQ1. Intent: order of operations. Answer: Multiply 7 by 3 and 4 by 1 first, then add to get 25. PQ2. Intent: meaning of modulo. Answer: It returns the remainder, here 5 when 25 is divided by 10. PQ3. Intent: weighted versus plain. Answer: A weighted sum multiplies each term by a chosen number before adding, which a plain sum does not. |
|---|---|
| Activity A.2. Appreciating Lesson Relevance Blur or Beep? Scenario: A customer is buying the last item in a store, but the cashier cannot scan it because part of the barcode is blurred. There is no second item to compare against. Discuss whether the store can still recover or check the code, and how. Figure 2. A blurred last digit at checkout motivates the idea of a check digit built from the rest. | Activity A.2. Appreciating Lesson Relevance Overview: This phase sets the purpose. Product codes carry a last digit built from the others, so a single missing or wrong digit can be checked or recovered. The scene motivates the lesson without naming the rule yet. Facilitation strategy: Let learners reason about a damaged code, then steer them to the idea that the final digit is not random but computed from the rest, which is what the lesson will formalize. Answer or response to the task: A wrong or missing digit can be caught or filled in, because the last digit is a check digit determined by the others through a weighted sum and a modulus. Note: The scene is meant to motivate the check-digit idea, not to teach the computation yet. Facilitating Reflection: PQ1. Intent: cost of a bad read. Answer: A wrong code can charge the wrong price or pull the wrong product, so accuracy matters. PQ2. Intent: recovery is possible. Answer: Yes. The last digit is fixed by the others, so it can be recomputed rather than guessed. |

-----

###### Processing Questions

#### 1. What problems arise when a code cannot be read correctly? 2. Could the store recover a single missing digit without

guessing? How?

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts Cracking the Barcode

A UPC-A barcode has 12 digits: the first 11 identify the product, and the 12th is a check digit. Apply the weighting and look for what makes a code check out.

###### Weighting: multiply the digits in odd positions (1st, 3rd, and so on)

by 3 and the digits in even positions by 1, then add.

1. For 0 36000 29145 2, form the weighted sum of all 12 digits 2. For 0 36000 29145 5, do the same.

3. State what is true of the weighted sum when a code is valid.

###### Processing Questions

1. What was the weighted sum modulo 10 for the valid code? 2. How did changing only the last digit change the result?

3. Complete the rule: a UPC-A code is valid exactly when \_\_\_\_.

###### Activity B.1. Exploring Key Concepts Overview: Through guided discovery, learners apply the weighting

to a valid code and to a copy with a wrong check digit, and find that validity is the condition that the weighted sum is 0 modulo 10. The two codes differ only in the last digit.

**Strategy, directing attention: Keep the weighting fixed and point**

attention to the result modulo 10. The valid code lands on 0; the altered code does not.

###### Procedure for the teacher:

#### 1. Have learners weight and add the digits of each code. 2. Have them reduce each total modulo 10. 3. Lead them to state the validity rule.

###### Answer to the task:

#### • 0 36000 29145 2: the weighted sum is 60, and 60 modulo 10 = • 0 36000 29145 5: the same weighting gives 63, and 63 modulo

0, so the code is valid.

10 = 3, so the code is invalid.

#### • Rule: a UPC-A code is valid exactly when its weighted sum is 0

modulo 10.

![](img_p180_1.png)

-----

| B.2. Discussing the Concept | Figure 3. A UPC-A code is valid exactly when its weighted sum is 0 modulo 10. Facilitating Reflection: PQ1. Intent: read the valid result. Answer: It was 0; the weighted sum 60 is 0 modulo 10. PQ2. Intent: see the check work. Answer: The wrong last digit raised the sum to 63, so the result modulo 10 was 3, not 0. PQ3. Intent: state the rule. Answer: A UPC-A code is valid exactly when its weighted sum is 0 modulo 10. |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Check Digits in Verification Systems In A.2 a blurred code raised the question, and in B.1 you found the UPC-A rule. Every system here follows one plan: weight the digits, reduce modulo a number, and use a check digit so the total comes out right. A way to think about it. The check digit works like the balancing figure at the foot of a ledger column. It is chosen so the weighted total comes out even, and if any digit above is wrong, the total no longer balances. Figure 4. The check digit fills the gap so the weighted total reaches the next multiple of the modulus. | Activity B.2. Deepening Conceptual Understanding Big ideas: Every system weights the digits, reduces modulo a number, and sets a check digit so the total comes out to 0. The weights and the modulus are chosen so common errors change the total. Strategy, definitional strand: Fix the meaning of weight, modulus, and check digit, and show all four systems share the same three steps. Strategy, relational strand: Compare the four systems side by side so the differences are only the weights and the modulus. Tie the choice of modulus to which errors are caught. Strategy, procedural strand: Drill the weight-add-reduce steps and the (10 - remainder) step, and have learners verify a known good code each time. Answer to the task posed: UPC-A check digit for 0 36000 29145 is 2. ISBN-10 0-306-40615-2 is valid. ISBN-13 check for 978-0-306- 40615 is 7. Luhn total for 1784 is 20, valid. Facilitating Reflection: PQ1. Intent: role of the check digit. Answer: It is chosen so the weighted sum of the whole code is 0 modulo the system's number. PQ2. Intent: why X appears. Answer: ISBN-10 reduces modulo 11, so the remainder can be 10, written X; ISBN-13 reduces modulo 10, so the check is 0 to 9. PQ3. Intent: catching a swap. |

![](img_p181_1.png)

-----

**UPC-A, modulo 10. Weight the first 11 digits, odd positions by 3 Answer: Adjacent digits carry different weights, so swapping them**

and even positions by 1, and add. Take the sum modulo 10. The changes the weighted sum and breaks the check. check digit is (10 - that remainder) modulo 10. For 0 36000 29145, the sum is 58, so the check digit is (10 - 8) modulo 10 = 2.

![](img_p182_1.png)

*Figure 5. The UPC-A check digit makes the full weighted sum reach*

0 modulo 10.

**ISBN-10, modulo 11. Weight the ten characters by 10, 9, down to**

1, and add. The code is valid when the total is 0 modulo 11. Because the remainder can be 10, the check character may be X, which stands for 10. For 0-306-40615-2 the total is 132, and 132 is 0 modulo 11.

**ISBN-13, modulo 10. Weight the thirteen digits by 1, 3, 1, 3, and**

so on, and add. The code is valid when the total is 0 modulo 10. For 978-0-306-40615 the first twelve give 93, so the check digit is (10 - 3) modulo 10 = 7.

-----

![](img_p183_2.png)

*Figure 6. ISBN-10 uses weights 10 down to 1 modulo 11; ISBN-13* uses weights 1 and 3 modulo 10.

**Comparison. ISBN-10 uses descending weights and a prime**

modulus, 11, which needs the symbol X. ISBN-13 uses the simpler weights 1 and 3 and modulus 10, so its check is always a digit.

**Luhn, modulo 10. From the right, double every second digit; if a**

doubled value passes 9, subtract 9. Add all the digits. The number is valid when the total is 0 modulo 10. For 1784 the total is 20, so it is valid.

![](img_p183_1.png)

*Figure 7. Luhn doubles every second digit from the right, then* checks the total modulo 10.

**Why it catches errors. A single wrong digit changes the weighted**

sum, so the remainder changes and the check fails. Because adjacent positions carry different weights, many adjacent swaps

-----

| shift the sum and are caught; a modulo 10 system can still miss a swap of two digits that differ by 5, since the shift is then a multiple of 10. The moduli and weights are chosen to catch as many of these errors as possible. Figure 8. Different weights and a modulus make a wrong digit or a swap shift the total. Processing Questions 1. Why does the check digit make the full weighted sum reach 0 modulo the chosen number? 2. Why can an ISBN-10 check character be X but an ISBN-13 check digit cannot? 3. Why does giving adjacent positions different weights help catch a swap? |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Overview: The set runs the same weight-add-reduce method across but the method does not, which is the variation principle behind the Strategy, guided then independent: Work Part 1 together to fix the each found check digit by re-adding. Answer to the task: • Part 1. 0 36000 29145 2: weighted sum 60, valid. 0 12345 67890 • Part 2. 0-306-40615-2: total 132, which is 0 modulo 11, valid. check is 1. • Part 3. 978-0-13-468599-?: the first twelve give 129, so the check • Part 4. 1784: total 20, valid. 1 2 3 4 5 ?: the running total forces Facilitating Reflection: PQ1. Intent: name the slip. Answer: Often the weighting, since the pattern of weights differs by | Learned Skills all four systems. The weights and modulus change from part to part, sequence. steps, then let learners run Parts 2 to 4. Require a verification of ?: the first 11 give 85, so the check digit is (10 - 5) modulo 10 = 5. 0-201-53082-?: the first nine give 98, which is 10 modulo 11, so the digit is (10 - 9) modulo 10 = 1. the check digit 5, since the total then reaches 20. system. |

-----

| C. Demonstrating Knowledge and Skills | PQ2. Intent: the zero case. Answer: When the remainder is 0, the (10 - remainder) modulo 10 step gives 0, not 10. PQ3. Intent: verify. Answer: Re-add with the found digit in place and confirm the total is 0 modulo the system's number. C.1. Finding Practical Application Activity C.1. Making Real-World Connections Breaking and Catching a Code Start from the valid ISBN-10 code 0-306-40615-2. You will alter it two ways and see whether the check catches the change. 1. Confirm the code is valid using weights 10 down to 1 and modulo 11. 2. Change one digit, for example the 4 to a 5, and test again. 3. Swap two adjacent digits, for example the 4 and the 0, and test again. 4. Record whether each change was caught, and explain why. Processing Questions 1. Did changing one digit make the code invalid? Why? 2. Did swapping two adjacent digits make it invalid? Why? 3. Why do verification systems use a weighted sum and a modulus to do this? | Answer: When the remainder is 0, the (10 - remainder) modulo 10 step gives 0, not 10. Answer: Re-add with the found digit in place and confirm the total is 0 modulo the system's number. Activity C.1. Making Real-World Connections Overview: Learners take a valid code, introduce the two most common errors, and watch the check digit catch them. The context is real verification, where a single bad digit must not pass. Strategy, error detection: Have learners recompute the weighted sum after each change and compare to 0 modulo 11. Tie the broken result to the kind of error introduced. Answer to the task: • 0-306-40615-2 is valid: the weighted total is 132, which is 0 modulo 11. • Changing the 4 to a 5 gives a total of 138, which is 6 modulo 11, so the code is now invalid; the single-digit error is caught. • Swapping the adjacent 4 and 0 gives a total of 128, which is 7 modulo 11, so it is invalid; the transposition is caught. Facilitating Reflection: PQ1. Intent: single-digit error. Answer: Yes. The wrong digit changed the weighted sum, so the total was no longer 0 modulo 11. PQ2. Intent: transposition. Answer: Yes. The swapped digits sat at positions with different weights, so the total shifted. PQ3. Intent: why this design. Answer: The weights and modulus are chosen so that common errors change the total and fail the check. |
|---|---|---|
|  | C.2. Making Generalization |  |
|  | Activity C.2. Wrapping up the Lesson Connecting the Codes Task 1. Complete each statement in your own words. 1. Every system forms a ____ of the digits, then reduces modulo a chosen number. 2. The ____ is set so the total comes out to 0 modulo that number. | Activity C.2. Wrapping up the Lesson Target conclusion: All four systems weight the digits, reduce modulo a chosen number, and set a check digit so the total is 0 modulo that number. The weights and the modulus are chosen so that single-digit errors and many adjacent transpositions change the total and fail the check. The exact errors caught depend on the modulus and the weights. |

-----

| 3. ISBN-10 uses modulo ____, while UPC-A, ISBN-13, and Luhn use modulo ____. Figure 9. Four verification systems share one structure: a weighted sum, a modulus, and a check digit. Processing Questions 1. State, in one sentence, the common idea behind all four systems. 2. What kind of error might still slip past a modulo 10 check? | Strategy, eliciting and fallback: Ask learners to state the shared structure in one sentence. If a statement names only one system, prompt them to find the same three steps in another. Answer to Task: First blank: weighted sum. Second: check digit. Third: 11; 10. Facilitating Reflection: PQ1. Intent: state the rule. Answer: Each system uses a weighted sum reduced modulo a chosen number, with a check digit that forces the total to 0. PQ2. Intent: mark the boundary. Answer: A modulo 10 check can miss a swap of two digits that differ by 5 in weight-1 and weight-3 positions, since the shift is a multiple of 10; modulo 11 avoids this. |
|---|---|
| C.3. Evaluating Learning (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity C.3. Assessing Answer Key, Part I (Multiple Choice) 1. C. The first 11 digits give a weighted sum of 85, so the check digit 2. C. The total must be 0 modulo 11, so the check is 11 - 1 = 10, 3. A. The first 12 digits give 129, so the check digit is (10 - 9) modulo 4. B. A Luhn number is valid when its total is 0 modulo 10. 5. B. The two positions carry different weights, so a swap changes and the pair 09 and 90 are not detected, which is why the item 6. A. 3(4) + 4(8) + 3(5) + 4(2) = 67, and 67 is 4 modulo 9, so X must Answer Key, Part II (Constructed Response) 1. The first 12 digits give 93, and with the check digit 7 the total is digit would change the weighted total, so the result would no | Learning Outcomes is (10 - 5) modulo 10 = 5. written X. 10 = 1. the total. This catches many adjacent swaps, but equal-digit swaps says most. be 5. 100, which is 0 modulo 10, so the code is valid. A single mistyped longer be 0 modulo 10 and the error would be caught. The change is 1 |

![](img_p186_1.png)

-----

| or 3 times a nonzero digit difference, and since both weights are coprime to 10 the change cannot be 0 modulo 10, so the check must fail. 2. The first 11 digits give a weighted sum of 100, which is 0 modulo 10, so the check digit is (10 - 0) modulo 10 = 0. Re-adding with 0 in place keeps the total at 100, which is 0 modulo 10. Rubric for the constructed-response items (Part II): 4 points each. Award 2 for a correct method shown, 1 for a correct result, and 1 for a correct explanation or verification. A bare answer with no work earns at most 1. Answer Key, Part III (True or False with Reasoning) 1. False. The check digit only verifies the code; it carries no product information. 2. True. Modulo 11 can leave a remainder of 10, which is written as X. 3. False. A mistyped digit changes the weighted sum, so the check fails and the error is caught. 4. True. Luhn doubles every second digit starting from the rightmost. 5. True. Both ISBN-13 and UPC-A use modulo 10. Scoring approach and total points: Part I, 6 items at 1 point, is 6. Part II, 2 items at 4 points, is 8. Part III, 5 items at 2 points, with 1 for the decision and 1 for the reason, is 10. The total is 24. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning |

###### For Remediation

**Purpose: This rebuilds the weight-add-reduce steps on small codes for learners who need more support. Facilitation strategy:**

#### 1. Have learners weight the digits one position at a time. 2. Guide them through the modulo step and the (10 - remainder) step.

###### Answer to the task:

• 0 11110 00000 ?: the first 11 digits give a weighted sum of 8, so the check digit is (10 - 8) modulo 10 = 2.

- 0-306-40615-2: the weighted total is 132, which is 0 modulo 11, so the code is valid.

###### For Enhancement

**Purpose: This turns the verification skill around: learners build a valid code, which is the design move the Performance Task asks for. Facilitation strategy:**

#### 1. Have learners weight their nine digits and reduce modulo 11. 2. Lead them to choose the check character that brings the total to 0.

###### Answer to the task:

- Sample: the body 1 2 3 4 5 6 7 8 9 gives a weighted sum of 210, which is 1 modulo 11, so the check character is X. The code 1-234-

56789-X is valid, since 210 + 10 = 220 is 0 modulo 11.

###### Facilitating Reflection:

**PQ1. Intent: role of the body digits. Answer: The check character is built to verify the first nine digits, so only those enter the weighted sum.**

-----

**PQ2. Intent: why modulo 11. Answer: Because 11 is prime, no swap of distinct digits can shift the total by a multiple of 11, so every adjacent transposition is caught. V. To evaluate learners' success in attaining the intended learning competencies, the assessment tools and strategies provided on ASSESSMENT the link in the table of contents can be utilized to measure understanding, skills, and application of concepts. VI. To assess and evaluate the effectiveness of the instruction, as well as to identify challenges and plan for improvements in this REFLECTION unit, teachers are encouraged to answer the reflective questions provided in the link indicated in the table of contents.**

###### UNIT 4. NETWORKS AND GRAPHS

###### I. LEARNING GOALS

| Content | The learners demonstrate knowledge and understanding of graphs as mathematical models of real-world relationships, including their |
|---|---|
| Standard | connectivity and traversability, spanning trees, and shortest paths. |
| Performance | By the end of the unit, the learners are able to solve problems involving graph theory algorithms (Eulerian and Hamiltonian paths and |
| Standard | circuits, spanning trees, shortest paths), and discuss the applications of graphs in transportation, communication, network design, productivity, etc., through a presentation or written work. |

**Learning** *The learners:* **Competencies** 1. illustrate elements of a graph (vertices/nodes, edges/arcs) and the different types of graphs (simple, directed, complete, bipartite,

connected, path, cycle, tree, regular, etc.);

2. explore some real-life situations where graphs are utilized;
3. differentiate between Eulerian and Hamiltonian paths/circuits;
4. apply Euler's theorem to determine the existence of Eulerian paths and circuits;
5. apply Dirac's condition for the existence of Hamiltonian circuits;
6. identify Eulerian and Hamiltonian circuits and paths in a connected graph;
7. explain spanning trees and their significance;
8. apply Breadth-First Search (BFS) and Depth-First Search (DFS) algorithms to find spanning trees in a connected graph; and
9. apply different methods to find shortest paths (Dijkstra's algorithm, Floyd-Warshall algorithm).

###### II. REFERENCES and MATERIALS

| Textbook and | Grinberg, D. (2023). An introduction to graph theory. arXiv. |
|---|---|
| Modules | https://doi.org/10.48550/arxiv.2308.04512 |
| Websites | Tutorials Point. (n.d.). Graph theory - Types of graphs. https://www.tutorialspoint.com/graph_theory/graph_theory_types_of_graphs.htm Rudich, A. (n.d.). Graph theory notation and terminology. University at Buffalo, Department of Computer Science and Engineering. |

[*https://cse.buffalo.edu/~atri/cse331/support/notation/graphs.html*](https://cse.buffalo.edu/~atri/cse331/support/notation/graphs.html) *Al al-Bayt University. (n.d.). Discrete mathematics lecture notes: Part 1.* [*https://web2.aabu.edu.jo/tool/course\_file/lec\_notes/901200\_Discrete14\_part1.pdf*](https://web2.aabu.edu.jo/tool/course_file/lec_notes/901200_Discrete14_part1.pdf) *Bing. (n.d.). Search results for Hamiltonian paths and circuits PDF.* [*https://www.bing.com/search?q=hamiltonian+paths+and+circuits+.pdf*](https://www.bing.com/search?q=hamiltonian+paths+and+circuits+.pdf) *Georgia Institute of Technology, School of Mathematics. (n.d.). Euler circuits and Hamiltonian cycles. https://trotter.math.gatech.edu/math-* [*3012/6-Euler\_Circuits\_and\_Hamiltonian\_Cycles.pdf*](https://trotter.math.gatech.edu/math-3012/6-Euler_Circuits_and_Hamiltonian_Cycles.pdf) *Dijkstra's Algorithm, See-Algorithms, accessed May 6, 2026,*

-----

[*https://see-algorithms.com/graph/Dijkstras.*](https://see-algorithms.com/graph/Dijkstras) *Graph Online. "Create Graph Online." Accessed May 6, 2026.* [*https://graphonline.top/en/.*](https://graphonline.top/en/) **Video lessons** *The Bright Side of Mathematics. (2020, October 15). Graph theory - Lecture 1: Introduction [Video]. YouTube.*

[*https://www.youtube.com/watch?v=ZQY4IfEcGvM*](https://www.youtube.com/watch?v=ZQY4IfEcGvM) *The Bright Side of Mathematics. (2020, October 22). Graph theory - Lecture 2: Degrees and handshaking lemma [Video]. YouTube.* [*https://www.youtube.com/watch?v=dxhFQyivdUs*](https://www.youtube.com/watch?v=dxhFQyivdUs) *The Bright Side of Mathematics. (2020, October 29). Graph theory - Lecture 3: Adjacency and incidence matrices [Video]. YouTube.* [*https://www.youtube.com/watch?v=Aj55yJ9Gz8Y*](https://www.youtube.com/watch?v=Aj55yJ9Gz8Y) *The Bright Side of Mathematics. (2020, November 5). Graph theory - Lecture 4: Isomorphisms [Video]. YouTube.* [*https://www.youtube.com/watch?v=StJCx7u0PIw*](https://www.youtube.com/watch?v=StJCx7u0PIw) *Euler Paths & the 7 Bridges of Konigsberg Wrath of Math. (2018, September 1). Euler paths & the 7 bridges of Konigsberg | Graph theory* [*[Video]. YouTube. https://www.youtube.com/watch?v=dSK5jTEe-AM*](https://www.youtube.com/watch?v=dSK5jTEe-AM) *Graph Theory: Euler Paths and Euler Circuits Kimberly Brehm. (2020, May 14). Graph theory: Euler paths and Euler circuits [Video].* [*YouTube. https://www.youtube.com/watch?v=5M-m62qTR-s*](https://www.youtube.com/watch?v=5M-m62qTR-s) *Graph Theory: Fleury's Algorithm Kimberly Brehm. (2020, May 15). Graph theory: Fleury's algorithm [Video]. YouTube.* [*https://www.youtube.com/watch?v=vvP4Fg4r-Ns*](https://www.youtube.com/watch?v=vvP4Fg4r-Ns) *Mathispower4u. (2014). Graph theory: Hamiltonian circuits and paths [Video]. YouTube.* [*https://www.youtube.com/watch?v=AamHZhAmR7o*](https://www.youtube.com/watch?v=AamHZhAmR7o) *Miran Fattah. (2015). Dirac's theorem [Video]. YouTube. https://www.youtube.com/watch?v=OGh5JKso0y4* *Brehm, K. (2023). Discrete math II - 10.5.2 Hamilton paths and circuits [Video]. YouTube.* [*https://www.youtube.com/watch?v=aOM1CsHMxKo*](https://www.youtube.com/watch?v=aOM1CsHMxKo) *Web Dev Simplified, "Dijkstra's Algorithm in 60 Seconds," YouTube Short, 0:45, March 14, 2024,* [*https://www.youtube.com/shorts/8kucL88Ci8E.*](https://www.youtube.com/shorts/8kucL88Ci8E) *@boraxalgo. "BFS Breadth First Search" YouTube Short, 0:19, January 18, 2023. https://www.youtube.com/shorts/umHJzlKFGlU.*

| Materials and | Writing | & Drawing Tools |
|---|---|---|
| EdTech | ● | Pencils or pens |
|  | ● | Markers/highlighters |
|  | ● | Colored pencils |
|  | ● | Sticky notes |
|  | ● | Scratch paper |

###### Measurement & Timing

- Ruler
- Timer

###### Printed Activity Sheets & References

- Activity sheet containing the delivery map
- Printed subdivision maps
- Printed Graphs (Graph 1, Graph 2, Graph 3)
- Printed sample graphs with student answers (corrected-with-error versions)
- Vertex degree table worksheet
- Validation worksheet (checklist format)
- Optional guide checklist for route validation

-----

|  | ● Answer sheets per group Display & Presentation Materials ● Manila paper or cartolina ● Station labels ● Learners' Thinking Web outputs ● Learners' drawn graphs Digital & Multimedia Resources • Laptops, tablets, or smartphones • Graphing software/applications (e.g., GeoGebra) • Online quiz platforms (Google Forms, Quizizz, etc.) • Internet access for instructional videos • YouTube lessons on Hamiltonian paths, circuits, and Dirac's | Theorem |
|---|---|---|
| AI Declaration | In preparing this Learning Exemplar (LE), the author(s) used generative assist in organizing ideas, developing sample activities, and generating validated, and finalized all content. The author(s) take full responsibility | artificial intelligence (Gemini, ChatGPT, Microsoft Copilot) tools to formative assessment items. The author(s) carefully reviewed, for the content of this LE. |

|  |  |  |
|---|---|---|
|  |  |  |
| III. CONTENT |  |  |
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. examine maps, road networks, and relational diagrams to 2. define a graph as an ordered pair G = (V, E) consisting of a 3. identify and label vertices, edges, vertex degrees, and adjacency 4. differentiate types of graphs through examples: simple, 5. construct graph representations of real-world situations 6. explain how graphs are used to model and analyze real-life | identify recurring elements (points and connections); set of vertices V and a set of edges E; in given graphs; directed, complete, bipartite, connected, path, cycle, tree, regular; and (transportation networks, social networks, communication networks). situations. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learner Readiness Sets at the Tricycle Terminal You already know how to read a set and how to read a simple diagram. This short warm-up brings both back. Study the map of Barangay Malinis in Figure 1. Four places are marked. A line drawn between two places means a road joins them directly. |  |

###### Lesson 4.1. Fundamental Concepts of Graph Theory

###### ANNOTATION

###### Activity A.1. Leveling Learner Readiness

**Purpose: This phase recalls two skills the lesson will build on: writing**

a set in roster form, and reading a point-and-line diagram. The map is the first quiet exposure to a graph, before any graph vocabulary is named.

**Strategy 1. Quick set recall. Have students write the two sets first.**

Confirm answers on the board: P = {T, S, M, C} and D = {S, M, C}. Keep set braces and commas visible, since the lesson will soon write a graph as a set of vertices and a set of edges.

-----

| Figure 1. Roads in Barangay Malinis Instructions: Answer each item using set notation and short phrases. Work with a seatmate if you wish. 1. Write the set P of all four places shown on the map, using roster form. 2. Write the set D of all places that have a direct road to the Tricycle Terminal (T). 3. Count the number of roads that touch the Market (M). Then count the roads that touch the Tricycle Terminal (T). Processing Questions: 1. How did you decide which places belong to set D? What did you look for on the map? 2. Two places can be listed in a set even when no road joins them. Is that true for this map? Give one pair that has no direct road. 3. A road always joins exactly two places. Why can a single road never touch three places at once? | Strategy 2. Re-teach for those who struggle. If some students cannot start, draw one road on the board and say it joins two places. Ask which two. Then let them list the rest. This re-teaches diagram Procedure for the teacher: 1. Show the map and read the legend with the class. 2. Have students write set P and set D, then count the roads at M and at T. 3. Confirm both sets and both counts on the board. 4. Run the three Processing Questions and use the answers below. Answer to the task: 1. P = {T, S, M, C}. 2. D = {S, M, C}. The terminal T has a direct road to each of these three. 3. Market M is touched by 2 roads (T to M, and C to M). Terminal T is touched by 3 roads (to S, to M, to C). Facilitating Reflection: PQ1. Intent: surface how students match a road to the two places it joins. Answer: students look for a line that ends at T, then name the other endpoint. PQ2. Intent: separate set membership from being joined by a road. Answer: yes; for example S and M are both in the set but have no direct road between them. PQ3. Intent: plant the idea that a connection has exactly two endpoints. Answer: a road joins one place to one other place, so it has two ends only. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance | Activity A.2. Appreciating Lesson Relevance Purpose: This phase sets the need for the lesson. Describing a network in ordinary sentences is slow and easy to get wrong. That difficulty motivates a compact notation, which the lesson supplies in B.2. The airline is fictional, so no real route map is reproduced. Strategy 1. Let the difficulty show. Do not rescue students too early. The point is for them to feel that plain prose is clumsy for a network. Two minutes of writing is enough. Strategy 2: Harvest their shortcuts. As pairs redraw each other's networks, list on the board any shorthand students invent, such as |

![](img_p191_1.png)

-----

|  | One Airline, One NetworkImagine you work at the dispatch desk of a small domestic airline, Himpapawid Air. A new agent asks you to describe the airline's route map over the phone, without sending the picture. You can only use words. Figure 2. Himpapawid Air domestic route map Look at the route map in Figure 2. Each dot is a city. Each line is a direct two-way flight between two cities. Instructions: Try to describe the network in writing so that the new agent could redraw it exactly, using your words alone. 1. Write two or three sentences that describe the whole route map. Name the cities and say which pairs have a direct flight. 2. Trade descriptions with a seatmate. Try to redraw your seatmate's network from their words only. Processing Questions: 1. What made the network hard to describe in plain sentences? 2. What would make this easier: a shorter way to write down a city, and a shorter way to write down one flight? What might that shorter way look like? | initials for cities or a dash for a flight. Affirm these. They are informal versions of the vertex-and-edge notation introduced next. Answer to the task: Answers will vary. A workable description names the cities, then lists each direct flight as a pair, for example: Manila connects to Laoag, Iloilo, Cebu, Puerto Princesa, Tacloban, and Davao; Cebu connects to Tacloban, Zamboanga, and Davao; Davao connects to Zamboanga. The map has 8 cities and 10 flights Facilitating Reflection: PQ1. Intent: expose the cost of describing a network in prose. Answer: it is long, repetitive, and easy to miss a flight or repeat one. PQ2. Intent: elicit the need for symbols. Answer: a short label for each city and a short mark for each flight; this previews vertices and edges. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Same Network or Not? Figure 3 shows four drawings. The first three are labeled with the same letters. The fourth is different. Study all four before you answer. Do not assume that two pictures showing different shapes must be different networks. | Activity B.1. Exploring Key Concepts Purpose: This phase uses an example space to make one critical feature discernible: a network is defined by which pairs are joined, not by where the points sit on the page. Networks 1 and 2 are the same network in two layouts. Network 3 shares the points but joins different pairs, so it is a different network. Network 4 is a non- example, since one line ends in empty space. |

![](img_p192_1.png)

-----

| Figure 3. Four network drawings for comparison Worksheet: Fill in the table. For Networks 1, 2, and 3, list the pairs of letters joined by a line. Then compare. 1. List the joined pairs in Network 1. 2. List the joined pairs in Network 2. 3. List the joined pairs in Network 3. 4. Look at Network 4. Is every line in it joining two labeled points? Explain what you notice. Processing Questions: 1. Networks 1 and 2 look different on the page. Are they joining the same pairs of letters? What does that tell you? 2. Network 3 uses the same five letters as Network 1. Is it joining the same pairs? How is it different? 3. What feature decides whether two drawings show the same network: the position of the points, or the pairs that are joined? 4. Why is Network 4 not a proper network drawing? | Strategy: Vary one thing at a time. The set of drawings is built so that only one feature changes at each step. From Network 1 to Network 2, the layout changes but the joined pairs stay the same. From Network 1 to Network 3, the joined pairs change. Network 4 breaks the rule that a line must join two points. Draw students' attention to what changed and what stayed the same between each pair of drawings. Answer to the task: 1. Network 1 joins: AB, AC, BC, CD, DE. 2. Network 2 joins: AB, AC, BC, CD, DE. These are the same pairs as Network 1. 3. Network 3 joins: AB, AC, BC, BE, DE. This differs from Network 1 in two pairs. 4. Network 4 has one line that ends at no labeled point, so it is not a valid drawing of a network. Facilitating Reflection: PQ1. Intent: separate layout from structure. Answer: yes, both join the same pairs, so they are the same network drawn two ways. PQ2. Intent: show that the same points can form different networks. Answer: no; Network 3 drops CD and adds BE, so it is a different network. PQ3. Intent: name the deciding feature. Answer: the pairs that are joined decide it, not the position of the points. PQ4. Intent: rule out a stray line. Answer: every line must join two named points; a line ending in space does not. |
|---|---|
| B.2. Discussing the Concept |  |
| Activity B.2. Deepening Conceptual Understanding The Language and Types of Graphs In B.1 you found that a network is decided by which pairs are joined. Mathematicians write this idea in one compact form. A graph is a pair G = (V, E). Here V is the set of vertices, the points. E is the set of edges, the connections. This is the shortcut the dispatcher in A.2 was missing. | Activity B.2. Deepening Conceptual Understanding Purpose: This phase delivers the core definitions: the pair G = (V, E), edge and arc notation, degree, in-degree and out-degree, the degree- sum relationship, and the named types. The two worked examples model the reading procedure that students will use for the rest of the lesson. |

![](img_p193_1.png)

-----

Think of a graph as a map of friendships. Each person is a vertex, and each friendship is an edge. A one-way follow on social media is an arc, since it points from one person to another and need not be returned. The same idea models roads, flights, and pipelines. A connection comes in two kinds. A two-way connection is an edge. A one-way connection is an arc. A graph that uses arcs is a directed graph. A graph that uses both edges and arcs is a mixed graph.

**Two ways to write the same connections.**

You will write connections in two registers, and you should be fluent in both. The quick register is fast to write by hand. It writes a twoway edge as AB, with no arrow, so AB equals BA. It writes a one-way arc with an arrow, as A→B. The formal register is the one the assessment uses. It writes a two-way edge as an unordered pair in braces, {A, B}, where the braces show there is no order, so {A, B} equals {B, A}. It writes a one-way arc as an ordered pair in parentheses, (A, B), where the order shows the direction from A to B, so (A, B) is not the same as (B, A). When a graph mixes both kinds, keep them in separate sets and write G = (V, E\_u, A\_d): here E\_u holds the undirected edges and A\_d holds the arcs.

One small graph, both registers: a single two-way edge between A and B is E = {AB} in the quick register and E\_u = {{A, B}} in the formal register. A single arc from A to B is A→B in the quick register and A\_d = {(A, B)} in the formal register.

**Worked example 1. an undirected graph.**

Read the graph in Figure 4. List its parts, then check your reading.

**Big ideas to land: A graph is a set of vertices and a set of connections.**

The drawing is only one picture of that set. Degree counts connections at a vertex. The degree sum is twice the number of edges. Types are labels that describe structure, and a graph may carry several at once.

**Three strands to teach: Definitional, the pair G = (V, E) with edge,**

arc, and degree. Relational, how this formalizes the joined pairs discerned in B.1 and what it feeds in B.3. Procedural, the five-step reading routine modeled on both worked examples.

**Strategy 1. Name what they already invented. Connect the**

notation to the shorthand students produced in A.2. Their initials for cities are vertices, and their dashes for flights are edges.

**Strategy 2. Model the reading procedure aloud. Walk through the**

five steps on worked example 1, then have students apply the same five steps to worked example 2 in pairs.

**Strategy 3. Use the gallery as a reference, not a list to memorize.**

Have students point to a gallery panel whenever they name a type, so the label stays tied to a picture.

###### Common misconceptions and teacher moves:

###### 1. Crossings are not vertices. When two edges cross on the page

with no labeled point at the crossing, that crossing is not a vertex. Point back to the airline map in A.2, where flight lines cross with no city there.

2. **AB and BA are the same edge. Counting AB and BA as two** edges double-counts. The degree-sum check exposes this: if the count comes out wrong, have students recount each edge once.
3. **Types are not exclusive. A graph can hold several labels. A** complete graph on 4 vertices is also 3-regular. A cycle is connected

![](img_p194_1.png)

and regular. Ask students to find two labels that fit one figure.

4. **Directed degree splits in two. Students may report one degree** for a directed vertex. Require both numbers, the in-degree and the out-degree, for every vertex of a directed graph.

###### Answer to the task:

WE1. V = {A, B, C, D, E}; E = {AB, AC, BC, CE, BD, DE}; degrees A2, B3, C3, D2, E2; degree sum 12 = 2 × 6 edges. WE2. E = {P→Q, Q→R, R→P, Q→S}; P (in 1, out 1), Q (in 1, out 2), R (in 1, out 1), S (in 1, out 0); total in 4 = total out 4 = 4 arcs. *Teacher's Technical Note: Both registers are taught in the student* *column: the quick form (AB and A→B) and the formal form ({A, B}, (A,* **Figure 4. Reading an undirected graph** *B), and G = (V, E\_u, A\_d)). The Summative Assessment uses the*

-----

Vertex set: V = {A, B, C, D, E}. Edge set in the quick register: E = {AB, AC, BC, CE, BD, DE}. The same edge set in the formal register is E\_u = {{A, B}, {A, C}, {B, C}, {C, E}, {B, D}, {D, E}}. The degree of a vertex is the number of edges that touch it. Here the degrees are A = 2, B = 3, C = 3, D = 2, E = 2. Add them: 2 + 3 + 3 + 2 + 2 = 12. The graph has 6 edges, and 12 = 2 × 6. The sum of all degrees is always twice the number of edges, because each edge adds one to the degree at each of its two ends.

**Worked example 2. a directed graph.**

When a graph has arcs, each vertex gets two counts. The in-degree counts arcs pointing into the vertex. The out-degree counts arcs pointing out of it.

*formal form. The set form {A, B} is the standard and correct one for a two-way edge, so accept it as fully correct. Have students rewrite one small graph in both registers so the match is secure.*

###### Facilitating Reflection:

PQ1. Intent: justify the degree-sum rule. Answer: each edge adds one to the degree at each of its two ends, so the total is two per edge, always even. PQ2. Intent: separate drawing from structure, from B.1. Answer: yes, same V and same E means the same graph, whatever the layout. PQ3. Intent: read in-degree in context. Answer: yes; in-degree 0 means nothing points into that vertex, such as a source that only sends out.

![](img_p195_1.png)

PQ4. Intent: confront the exclusivity misconception. Answer: many valid pairs, for example a complete graph on 4 vertices is also regular; a cycle is also connected.

**Figure 5. Reading a directed graph**

Arc set, read from Figure 5, in the quick register: E = {P→Q, Q→R, R→P, Q→S}. The same arcs in the formal register are A\_d = {(P, Q), (Q, R), (R, P), (Q, S)}. The in-degree and out-degree of each vertex are P (in 1, out 1), Q (in 1, out 2), R (in 1, out 1), and S (in 1, out 0). The total in-degree is 4 and the total out-degree is 4, which equals the 4 arcs. Every arc starts at one vertex and ends at one vertex, so it adds one to a total out-degree and one to a total in-degree.

*Note: In a mixed graph, count an undirected edge as a connection at each endpoint, and count each arc by its direction as an in or an out. Keep the two ideas separate.*

-----

**A gallery of graph types.**

The same two pieces, vertices and connections, build many named types. Study the gallery in Figure 6, then read the table of everyday examples. A graph can carry more than one label at once.

![](img_p196_1.png)

###### Type Everyday example Simple

###### Directed

|  |  |  |
|---|---|---|
|  |  |  |
|  |  |  |
| Complete |  |  |
| Bipartite |  |  |
| Connected |  |  |
| Path |  |  |
| Cycle | A ring road that loops back to where it started. |  |
| Tree |  |  |
| Regular |  |  |

**Figure 6. A gallery of graph types**

A friendship map where each pair is either friends or not, with no repeats. A set of one-way streets, where each arrow shows the only legal direction. A small group chat where every member is connected to every other member. Students on one side, clubs on the other, with lines only from a student to a club. A barangay road map where you can reach any place from any other place. A jeepney route that runs in one open line from the first stop to the last.

A family chart or a folder structure that branches out with no loops. A tournament where every team plays the same number of matches.

-----

| How to read any graph, in five steps. 1. List the vertices. Write them as the set V. 2. List the connections. In the quick register, write a two-way link as an edge such as AB and a one-way link as an arc such as A→B. In the formal register, write an edge as an unordered pair {A, B} and an arc as an ordered pair (A, B). 3. Find each degree. In an undirected graph, the degree of a vertex is the number of edges touching it. 4. For a directed graph, give each vertex an in-degree and an out- degree. 5. Name the type. Use the gallery to decide which labels fit, such as simple, complete, bipartite, a path, a cycle, a tree, regular, connected, or mixed. Processing Questions: 1. Why does the degree sum always come out even, no matter which graph you pick? 2. Two students draw the same vertex set and the same edge set but place the points differently. Did they draw the same graph? Explain. 3. In a directed graph, can a vertex have in-degree 0? What would that mean in a real network? 4. Give one graph that fits two type labels at once, and name both labels. |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing | Learned Skills |

**Purpose: This phase builds fluency with reading and building graphs. Part I is guided so the procedure is rehearsed together. Part II is**

independent and produces the readiness evidence for C.1 and the assessment. Item 7 rehearses the draw-from-degrees skill in Summative Assessment item 21. Item 6 rehearses the mixed and disconnected reading in Summative Assessment items 4 and 22.

**Variation principle: The set moves by structure, not by surface difficulty. Items 1 to 5 read graphs that are given, first undirected then**

directed. Item 6 reads a mixed and disconnected graph. Item 7 reverses the demand, building a graph from a degree constraint. Item 8 classifies by type. The vocabulary from B.2 stays constant while the task demand varies from reading to building to classifying.

###### Part I. Guided Practice

**Guidance: Work items 1 to 5 on the board with the class. Insist on the degree-sum check in item 2. For item 4, require both the in-degree**

and the out-degree of W.

-----

###### Part II. Independent Practice

**Guidance: Let students work items 6 to 8 alone or in pairs. Circulate. The answer figure for item 6 is below; reveal it only after students**

attempt the item.

![](img_p198_1.png)

|  | Figure 8. The AirLink network, worked answer Success criterion: A student who completes items 6 to 8 with at most one error is ready for C.1 and the summative items. More than one error signals a return to the B.2 worked examples. Answer to the task: 1. V = {A, B, C, D, E}; E = {AB, AD, BC, BD, CD, CE}. 2. Degrees A2, B3, C3, D3, E1; sum 12 = 2 × 6 edges. 3. Adjacent to C: B, D, E. The graph is connected; every vertex is reachable. 4. Arc set = {W→X, X→Y, Y→W, W→Z, Z→Y}; W has in-degree 1 and out-degree 2. 5. Directed; every connection is an arrow, so all links are arcs. 6. (a) V = {M, C, D, B, P}; E = {MC, CD, D→M, M→B}. (b) D has in-degree 0 and out-degree 1. (c) Not connected, since P is isolated; mixed, since it has both edges and arcs. See the figure. 7. E = {AB, AC, AD}; this is the only answer, and it is a star, which is a tree. Check: degrees A3, B1, C1, D1; sum 6 = 2 × 3. 8. (a) complete. (b) cycle. (c) tree. (d) bipartite. Facilitating Reflection: PQ1. Intent: confirm the degree-sum check as the go-to verification. Answer: the sum of degrees equals twice the number of connections. PQ2. Intent: tie in and out degree to arcs. Answer: when the graph has arcs, that is, when it is directed or mixed. PQ3. Intent: reinforce the meaning of connected. Answer: no path reaches Puerto Princesa, so one isolated town leaves the graph disconnected. |
|---|---|
| C. | C.1. Finding Practical Application |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Activity C.1. Making Real-World Connections Smart Village Network Design Purpose: This phase applies the lesson to an authentic barangay Barangay San Isidro is building a Smart Village. Five sites must be design problem. Students model sites as vertices, roads as edges, and connected: School (S), Health Center (H), Market (M), Power Plant power lines as arcs, then test their model. This is the direct rehearsal (P), and Tanod Outpost (T). Two-way roads carry people and data of the Performance Task. |

-----

between two sites. The Power Plant sends one-way power lines to **Strategy 1. Accept any design that meets the rules. There is more** the sites that need electricity. Your job is to design the network. than one correct network. Judge a design by the three rules, not by

![](img_p199_1.png)

**Figure 9. Smart Village sites, the design canvas** the tested cut. Note on efficiency versus the stress test. Rules 1 to 3 **Design rules:** minimal four-link design as correct for the rules. It fails the Task 4

1. Use a line for a two-way road between two sites. Use an arrow stress test, because cutting any one power line strands a site. The from P for a one-way power line. sample adds the two roads SH and MT so that power has a second
2. Every site must receive power, either straight from the Power path, which is what lets it survive the cut. Treat Task 4 as a separate Plant or through a road from a site that already has power. diagnostic, not as part of Rule 3.

![](img_p199_2.png)

3. Keep the design efficient. Use as few links as you can while meeting the rules.

###### Tasks:

1. Draw your network on the canvas. Mark each road and each power line.
2. Write the vertex set V and the edge set E, using edge and arc notation.
3. Give the out-degree of the Power Plant P.
4. Stress test: if one power line failed, could every site still get power? Name the line you tested and explain.

###### Processing Questions:

1. How did you decide which links to add and which to leave out?
2. In your design, what does a vertex stand for? What does an arc capture that an edge cannot?
3. If the barangay added one new site next year, what is the **Figure 10. A workable Smart Village design with one power line cut** smallest change that would keep every site powered?

matching the sample answer. Require edge and arc notation in task 2.

**Strategy 2. Push the stress test. Task 4 is the key reasoning step.**

It asks whether power survives a single failure. Have students name the exact line they remove and trace whether power still reaches every site.

**Answer to the task: One workable design: roads SH and MT; power**

lines P→S, P→H, P→M, P→T. Then V = {S, H, M, P, T} and E = {SH, MT, P→S, P→H, P→M, P→T}. In the formal register the edges and arcs split into the undirected edge set E\_u = {{S, H}, {M, T}} and the arc set A\_d = {(P, S), (P, H), (P, M), (P, T)}, written together as G = (V, E\_u, A\_d). The out-degree of P is 4. Stress test: remove the line P→H. The Health Center still gets power, because the road SH carries power from S, and S is powered by P→S. The figure shows this design and are already met by the four power lines P→S, P→H, P→M, P→T alone, which is the fewest links that still powers every site, so accept that

###### Facilitating Reflection:

PQ1. Intent: surface design trade-offs. Answer: students weigh covering every site against using few links; redundancy helps the stress test but adds links.

-----

| C.2. Making Generalization | PQ2. Intent: connect model to meaning. Answer: a vertex is a site; an arc captures one-way flow, such as power that moves from the plant outward but not back. PQ3. Intent: test transfer to a larger network. Answer: add the new site as a vertex, then give it one power line from P or one road from a powered neighbor. |
|---|---|
| Activity C.2. Wrapping up the Lesson Connecting the Dots Pull the lesson together. The frame below organizes the main ideas. Fill the blank boxes with the right key words, then complete the sentences. Figure 11. Concept map frame Complete each sentence: 1. A graph is written G = (V, E), where V is the set of ________ and E is the set of ________. 2. A two-way connection is an ________. A one-way connection is an ________. 3. The degree of a vertex is the number of ________ that touch it, and the sum of all degrees equals ________ the number of edges. 4. Two drawings show the same graph when they have the same ________ and the same ________. 5. A graph can carry more than one type label at once. For example, a complete graph on four vertices is also ________. Processing Questions: 1. In one sentence, what decides whether two drawings are the same graph? | Activity C.2. Wrapping up the Lesson Purpose: This phase states the generalization and marks the limits of the lesson. Students articulate the definition in their own words and see where the unit goes next. Strategy: Have students complete the frame from memory first, then check against the gallery and worked examples. Read a few completed sentences aloud to surface wording differences. Target conclusion: Stated by students in their own words: a graph is its set of vertices and its set of connections, the drawing is one of many pictures of the same graph, and an edge is two-way while an arc is one-way. The form can be a verbal statement, the symbolic G = (V, E), or the completed map. Answer to the task: Completed frame and sentences: (1) vertices; edges and arcs. (2) edge; arc. (3) connections; twice. (4) vertex set; edge set. (5) regular. The completed concept map is shown below. Figure 12. Completed concept map Boundary of the lesson: Keep the work inside this lesson's scope. The lesson defines graphs and their types. It does not weight the connections; weighted graphs and shortest paths come in LE4.5. It does not trace a route that uses every edge or visits every vertex; Eulerian and Hamiltonian traversals come in LE4.2 and LE4.3. Trees are named here as a type but are studied as spanning trees in LE4.4. |

![](img_p200_1.png)

![](img_p200_2.png)

-----

2. This lesson did not put numbers on the connections, and it did not ask for a route that uses every connection or visits every vertex. Where do you think those ideas belong?

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

|  | Facilitating Reflection: PQ1. Intent: articulate the core idea. Answer: the vertex set and the connections decide it, not the layout on the page. PQ2. Intent: mark the boundary. Answer: numbers on connections and full-coverage routes belong to later lessons in the unit. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

**Purpose: This check collects evidence on the lesson objectives: graph notation, degree, adjacency, types, and the mixed and directed reading.**

It carries no figures and no processing questions, by design.

**Answer key, Part I: 1-C, 2-C, 3-B, 4-D, 5-A, 6-B, 7-B. One point each, 7 points total. Answer key, Part II: Either register is acceptable. A student may answer in the quick form or the formal form, and both score full marks.**

1. Quick form E = {JK, JL, JM, KL, KM}; formal form E\_u = {{J, K}, {J, L}, {J, M}, {K, L}, {K, M}}. Check: degrees J3, K3, L2, M2; sum 10 = 2 × 5 edges. Rubric, 4 points: 1 for using the degree sum to get 5 edges, 2 for the correct edge set, 1 for the verification.
2. V = {S, B, M}. Quick form E = {SB, B→M}; formal form E\_u = {{S, B}}, A\_d = {(B, M)}, so G = (V, E\_u, A\_d). The graph is mixed. The outdegree of B is 1. Rubric, 3 points: 1 for notation, 1 for classification, 1 for the out-degree.

###### Answer key, Part III:

1. True. Each vertex joins all of the other n minus 1 vertices.
2. False. The degree sum equals twice the number of edges.
3. True. A cycle on n vertices has n edges.
4. False. A tree on n vertices has n minus 1 edges, so six.
5. True. The vertex with no connection cannot be reached from any other, so the graph is not connected.

**Scoring: Part I 7 points, Part II 7 points, Part III 10 points, for 24 points total. Mastery is 18 of 24, which is 75 percent.** ***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

###### For Enhancement

###### The Global Logistics Hub

**Purpose: This activity extends the modeling objective to a directed, mixed network and previews routing without assessing it. Formal**

shortest-path methods come in LE4.5; here students only compare routes by counting hops.

**Strategy: Let students find any valid detour first, then compare routes by hop count. Do not require the shortest route; the comparison is**

the point.

**Answer to the task: (1) V = {M, T, S, K, N}; E = {M→T, M→S, T→N, S→K, K→N, MK, TS}. In the formal register this splits into the undirected**

edge set E\_u = {{M, K}, {T, S}} and the arc set A\_d = {(M, T), (M, S), (T, N), (S, K), (K, N)}, written together as G = (V, E\_u, A\_d). (2) With Tokyo closed, one working route is M→S→K→N, which is three hops. (3) A shorter detour uses the ground lane: take the edge M to K, then the arc K→N, which is two hops. So the two-hop route through Seoul by ground lane is shorter. Figure 14 highlights the three-hop all-flight route and marks Tokyo closed.

-----

![](img_p202_1.png)

|  | Figure 14. Rerouting when Tokyo closes Facilitating Reflection: PQ. Intent: push past hop-counting. Answer: a real airline weighs cost, capacity, and schedule, so the longer all-flight route can still be the better choice. For Remediation The Social Circle Recap Purpose: This activity rebuilds the edge-versus-arc distinction and degree from B.2 for students who did not reach mastery in C.3. Strategy: Sit with the pair. Have them trace each arrowhead and say it aloud as from one friend to the other before they draw. Answer to the task: (1) Undirected: E = {YA, YB}; degrees Y 2, A 1, B 1. (2) Directed: E = {Y→A, Y→B, A→B}; out-degrees Y 2, A 1, B 0. (3) Bea has out-degree 0; she follows no one, although others follow her. Figure 15 shows both versions side by side. Figure 15. Two-way and one-way versions of one trio Facilitating Reflection: PQ. Intent: locate the edge-versus-arc gap. Answer: each arrow points one way, from the follower to the followed, unlike a two-way |
|---|---|
| III. CONTENT | Lesson 4.2. Eulerian Paths and Circuits |
| IV. OBJECTIVES | At the end of the lesson, learners are able to: 1. examine the Königsberg bridge problem to motivate Eulerian path and circuit concepts; 2. define an Eulerian path as a path that uses every edge of a graph exactly once; 3. define an Eulerian circuit as an Eulerian path that returns to its starting vertex; 4. examine connected graphs with various vertex-degree configurations and identify the pattern in Euler's theorem; |

![](img_p202_2.png)

-----

| V. PROCEDURES | 5. state Euler's theorem: a connected graph has an Eulerian circuit if and only if every vertex has even degree; an Eulerian path that is not a circuit exists if and only if exactly two vertices have odd degree; 6. apply Euler's theorem to determine the existence of Eulerian paths and circuits in given connected graphs; and 7. identify and trace Eulerian paths and circuits in connected graphs (e.g., using Fleury's procedure for guidance). LEARNERS ACTIVITIES | 5. state Euler's theorem: a connected graph has an Eulerian circuit if and only if every vertex has even degree; an Eulerian path that is not a circuit exists if and only if exactly two vertices have odd degree; 6. apply Euler's theorem to determine the existence of Eulerian paths and circuits in given connected graphs; and 7. identify and trace Eulerian paths and circuits in connected graphs (e.g., using Fleury's procedure for guidance). ANNOTATION |
|---|---|---|
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learner Readiness Count and Trace Last lesson you learned to read a graph and to count the degree of a vertex, the number of edges that meet there. Today's lesson is about tracing routes through a graph. This warm-up brings both skills back. Figure 1. Two shapes to trace Instructions: Work with a seatmate. Use set notation and short phrases. 1. In Shape 1, count the degree of each vertex A, B, C, and D. 2. In Shape 2, count the degree of each vertex A, B, C, and D. 3. Try to draw each shape in one continuous stroke, without lifting your pen and without going over any line twice. Note which one you could do. Processing Questions: 1. What does the degree of a vertex count? 2. Which shape could you draw in one stroke, and which one defeated you? 3. Look only at the shape you could trace. Did anything about its corners seem different from the other shape? | Activity A.1. Leveling Learner Readiness Purpose: This phase recalls two skills the lesson will build on: counting the degree of a vertex, from the last lesson, and tracing a continuous route through a graph. The two shapes prepare the discovery in B.1 without naming today's rule. Strategy 1. Quick degree recall. Have students write the degree of each vertex first. Confirm on the board. Keep the word degree visible, since today's whole test depends on it. If a student is unsure, picture degree as the number of streets meeting at a corner. Strategy 2. Let Shape 2 resist. Shape 2 cannot be drawn in one stroke. Do not explain why yet. The point is for students to feel that some shapes can be traced and some cannot, which is exactly what B.1 will explain. Procedure for the teacher: 1. Show the two shapes and read the instructions. 2. Have students write the degree of every vertex in both shapes. 3. Have students try to trace each shape in one stroke and mark which one worked. 4. Run the three Processing Questions and use the answers below. Facilitating Reflection: PQ1. Intent: recall degree. Answer: the number of edges meeting at the vertex. PQ2. Intent: surface the puzzle. Answer: Shape 1 can be traced in one stroke; Shape 2 cannot. PQ3. Intent: plant the odd-degree idea without naming it. Answer: accept any noticing; some students will sense the corners differ. The rule comes in B.1. |
|  | A.2. Establishing the Purpose of the Lesson |  |
|  | Activity A.2. Appreciating Lesson Relevance The Walk Across Königsberg | Activity A.2. Appreciating Lesson Relevance Purpose: This phase sets the need for the lesson. The Königsberg walk feels like it should be possible, but every attempt fails. That gap |

![](img_p203_1.png)

-----

Long ago in the city of Königsberg, a river split the city into four motivates a test that settles the question by reasoning, not by land areas. Seven bridges joined those areas. People who walked guessing. The puzzle is the historical birthplace of this whole topic. the city asked one question that no one could settle.

![](img_p204_1.png)

|  | Figure 2. Königsberg in 1613: four land areas, seven bridges Note. Base map: Bering, J. (1613). Konigsberg [engraving]. Wikimedia Commons. Public domain. https://commons.wikimedia.org/wiki/File:Koenigsberg,_Map_by_ Bering_1613.jpg Region tints and bridge marks added for this lesson exemplar. Figure 2 is a real map of the city from 1613. The four land areas are tinted, and the seven bridges are marked in red. The river separates the areas, and the only way across is by a bridge. Instructions: Try to plan a walk that crosses every bridge exactly once. You may start on any land area. 1. Trace a route on the map that crosses each bridge once. Mark the bridges as you cross them. 2. If you get stuck before crossing all seven, mark where you stopped and how many bridges were left. Processing Questions: 1. What is this puzzle asking you to do? 2. After a few tries, can you be sure whether it is possible or impossible? What would make you sure? | PQ2. Intent: expose the limit of trial and error. Answer: trying cannot prove impossibility; a rule about the graph can. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Trace, Then Count Figure 3 shows three graphs. For each one, try to draw the whole graph in one continuous stroke, using every edge exactly once. You may pass through a vertex more than once, but you may use each edge only once. Then count the odd-degree vertices. | Activity B.1. Exploring Key Concepts Purpose: This phase uses an example space to make one feature discernible: the number of odd-degree vertices decides whether a graph can be traced using every edge once. The set is built so only that number changes across the three graphs. |

**Strategy 1. Let them try and fail. Give two or three minutes of**

honest attempts. The failure is the hook. Do not hint that it is impossible.

**Strategy 2. Collect the attempts. Gather a few routes on the board.**

Show that all of them either skip a bridge or repeat one. Ask whether more tries would help.

###### Answer to the task: No walk crosses every bridge exactly once. The

lesson will show the reason in B.2. Do not reveal the degree reason here; let A.2 stay a question.

###### Facilitating Reflection:

PQ1. Intent: state the goal. Answer: cross every bridge exactly once, with no bridge skipped or repeated.

-----

![](img_p205_1.png)

**Strategy: Vary one thing at a time. All three graphs are connected, so only the odd-vertex count changes across the set.**

Graph 1 has 0 odd vertices, Graph 2 has 2, Graph 3 has 4. Keep students counting odd vertices, not edges or vertices visited. Write the three counts side by side so the pattern stands out.

###### Answer to the task:

1. Graph 1, the bowtie, has all even degrees, 0 odd. It can be traced and returns to the start, a closed loop.
2. Graph 2, the square with one diagonal, has 2 odd vertices, A and C. It can be traced but ends at a different vertex, an open route.
3. Graph 3, the four corners all joined, has 4 odd vertices. It cannot be traced using every edge once. See Figure 4.

![](img_p205_2.png)

**Figure 3. Three graphs to trace**

**Worksheet: For each graph, fill in three things.**

1. Could you trace it using every edge exactly once? Write yes or no.
2. If yes, did you end at the same vertex where you started, or at a different one?
3. Count the vertices that have an odd degree. Write the number.

###### Processing Questions:

1. Look at the graph you could trace as a closed loop, back to the start. How many odd-degree vertices did it have?
2. Look at the graph you could trace but had to end somewhere else. How many odd-degree vertices did it have?
3. Look at the graph you could not trace at all. How many odddegree vertices did it have?
4. What rule connects the number of odd-degree vertices to whether you can trace the graph?

**Figure 4. Why Graph 3 cannot be traced**

###### Facilitating Reflection:

PQ1. Intent: tie a closed trace to 0 odd. Answer: 0 odd-degree vertices. PQ2. Intent: tie an open trace to 2 odd. Answer: 2 odd-degree vertices, and the trace starts and ends at those two. PQ3. Intent: tie failure to more than 2 odd. Answer: 4 odd-degree vertices. PQ4. Intent: state the discovered rule. Answer: 0 odd means a closed trace, 2 odd means an open trace, more than 2 odd means no full trace.

-----

| B.2. Discussing the Concept |  |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Euler's Test for Tracing a Graph In 1736 Leonhard Euler settled the Königsberg puzzle. He did not try more routes. He changed the picture. Each land area became a vertex, and each bridge became an edge. The map turned into a graph with four vertices and seven edges, as Figure 5 shows. Figure 5. From the city map to a graph Note. Base map: Bering, J. (1613). Konigsberg [engraving]. Wikimedia Commons. Public domain. https://commons.wikimedia.org/wiki/File:Koenigsberg,_Map_by_ Bering_1613.jpg Tints, bridge marks, and graph added for this lesson exemplar. Euler then counted the degree of each vertex. Every one is odd: the island has degree 5, and the other three areas have degree 3. From this alone he proved no walk can cross every bridge exactly once. The reason is the rule you discovered in B.1. Two kinds of traversal. An Euler path is a route that uses every edge of a connected graph exactly once. You may pass through a vertex more than once, but | Activity B.2. Deepening Conceptual Understanding Purpose: This phase delivers the formal account: the Königsberg reduction, the definitions of Euler path and Euler circuit, Euler's theorem stated by the count of odd vertices, and Fleury's procedure for tracing a route. The worked examples model the counting and the tracing students will repeat in B.3. Big ideas to land: Traceability is decided by counting odd-degree vertices, not by trying routes. Zero odd means a closed route, two odd means an open route between those two, more than two means no full route. An Euler route uses every edge once; vertices may repeat. Three strands to teach: Definitional, Euler path, Euler circuit, and odd degree. Relational, how this formalizes the pattern discovered in B.1 and what it feeds in B.3. Procedural, the count-the-odd-vertices test and Fleury's tracing routine modeled on Figures 7 and 8. Strategy 1. Anchor on the discovery. Connect the theorem to the three counts students recorded in B.1. The theorem is their pattern, now stated once and for all. Strategy 2. Separate exists from find. Make clear that Euler's theorem only says whether a route exists. Fleury's procedure is the separate skill of actually tracing one. Demonstrate Figure 8 slowly, asking students to predict the next edge. Strategy 3. Keep it on edges. Repeat that an Euler route is about using every edge once, not visiting every vertex once. Visiting every vertex once is a different idea that comes in the next lesson. Answer to the task: Königsberg. Degrees 5, 3, 3, 3; four odd vertices; more than two odd, so neither an Euler path nor an Euler circuit. No walk crosses every bridge once. Figure 7. Degrees A = 3, B = 2, C = 4, D = 3, E = 2; two odd vertices, A and D; Euler path that is not a circuit, from A to D. Figure 8. All degrees even; Euler circuit A to B to C to D to E to C to A, using each edge once and returning to A. Facilitating Reflection: PQ1. Intent: value the reduction. Answer: the graph keeps only what matters, the connections and their counts, so the question can be settled by degrees. PQ2. Intent: separate path and circuit. Answer: a circuit returns to its start; a path may end at a different vertex. PQ3. Intent: state both conditions. Answer: all even for a circuit; exactly two odd for a path that is not a circuit. PQ4. Intent: apply to Königsberg. Answer: four odd vertices is more than two, so neither route exists. |

![](img_p206_1.png)

-----

each edge is used only once. The route may start and end at different PQ5. Intent: justify Fleury's rule. Answer: crossing such an edge vertices. An Euler circuit is an Euler path that returns to its starting would strand the remaining edges on the far side, leaving some vertex, a closed route that uses every edge exactly once. unreachable.

![](img_p207_1.png)

**Figure 6. An Euler path and an Euler circuit**

Think of a mail carrier who must walk along every street once to deliver to both sides. An odd corner is a corner the carrier cannot pass through cleanly, because each visit uses two street-ends and an odd corner leaves one street-end unpaired. That is why odd corners can only be the start or the finish.

**Euler's theorem.**

For a connected graph, count the vertices of odd degree.

1. If every vertex has even degree, the graph has an Euler circuit.
2. If exactly two vertices have odd degree, the graph has an Euler path that is not a circuit. The two odd vertices must be the start and the end.
3. If more than two vertices have odd degree, the graph has neither an Euler path nor an Euler circuit. A graph can never have exactly one odd vertex, because the degrees of all vertices always add up to an even number. So the count of odd vertices is always 0, 2, 4, and so on.

**Apply the test.**

In the graph in Figure 7, the degrees are A = 3, B = 2, C = 4, D = 3, E = 2. Exactly two vertices, A and D, are odd. By the theorem the graph has an Euler path that is not a circuit, and that path must start at A and end at D, or the reverse.

-----

![](img_p208_1.png)

**Figure 7. Applying the odd-vertex test**

**Tracing one with Fleury's procedure.**

Knowing a route exists is not the same as finding it. Fleury's procedure finds one without getting stuck.

1. For an Euler circuit, start at any vertex. For an Euler path, start at one of the two odd vertices.
2. At each step, choose any remaining edge to leave the current vertex, but do not choose an edge whose removal would split the remaining graph into separate pieces, unless it is your only choice.
3. Use that edge, then erase it. Move to the next vertex and repeat until every edge is used.

![](img_p208_2.png)

**Figure 8. Tracing an Euler circuit with Fleury's procedure** ***Processing Questions:***

1. Why did Euler turn the bridge map into a graph instead of trying more walking routes?
2. How does an Euler path differ from an Euler circuit in where it starts and ends?
3. State the degree condition for an Euler circuit and the degree condition for an Euler path that is not a circuit.

-----

4. Königsberg has four odd vertices. Explain, using the theorem, why no walk crosses every bridge once.
5. Why does Fleury's procedure tell you to avoid an edge whose removal would disconnect the graph?

###### B.3. Developing Mastery

###### Activity B.3. Practicing Learned Skills

**Purpose: This phase builds fluency with the odd-vertex test and with tracing. Part I rehearses the routine together. Part II is independent**

and produces the readiness evidence for C.1 and the assessment. Items 4 and 5 rehearse the degree-list reasoning of Summative Assessment items 7 and 23.

**Variation principle: The set moves by structure, not by surface difficulty. Items 1 to 3 read three given graphs whose odd counts are 0, 2,**

and 4. Item 4 drops the picture and works from a degree list alone. Item 5 reverses the task, changing a graph to reach a target traversability. The test stays constant while the demand moves from reading, to classifying without a drawing, to modifying.

**Guidance for Part I. Work items 1 and 2 on the board. Count odd vertices aloud first, classify, then trace. For item 2, mark the two odd**

vertices as the required endpoints before tracing.

**Guidance for Part II. Let students work items 3 to 5 alone or in pairs. For item 5, any edge joining two of the four odd vertices works;**

check that the new odd count is 2.

**Success criterion: A student is ready for C.1 when they can count odd vertices, state the correct case, and trace a route in at least items**

1 and 2 without help.

###### Answer to the task:

1. Graph 1, the pentagon: all degrees 2, 0 odd, Euler circuit, for example A to B to C to D to E to A.
2. Graph 2: degrees give 2 odd, C and E; Euler path from C to E, for example C to A to B to C to D to E.
3. Graph 3: 4 odd vertices, so neither; more than two odd vertices rules out any full route.
4. All five degrees are even, so the graph has an Euler circuit.
5. Add the edge joining the two degree-one vertices, E and F. The new odd vertices are A and C, so an Euler path now runs from A to C. See Figure 10 for the classifications.

**Figure 10. Classification answers**

![](img_p209_1.png)

###### Facilitating Reflection:

PQ1. Intent: name the one-step test. Answer: count the odd-degree vertices: 0, 2, or more than 2. PQ2. Intent: surface the sticking point. Answer: accept reasoned answers; tracing is usually harder than classifying. PQ3. Intent: validate a route. Answer: check each edge is crossed and none is repeated, by ticking edges off as you go.

-----

| C. | C.1. Finding Practical Application |  |
|---|---|---|
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections The Barangay Street Sweeper A barangay assigns a sweeper to clean every street. To save fuel and time, the sweeper wants to drive along each street exactly once. The map in Figure 11 shows the intersections as vertices and the streets as edges. Figure 11. Barangay street map Tasks: Use Euler's theorem. Show your degree counts. 1. Count the degree of each intersection A through F. 2. How many intersections have an odd degree? 3. Does the street map have an Euler circuit, an Euler path that is not a circuit, or neither? State which. 4. If it is an Euler path, name the two intersections where the sweeper must start and finish, then trace one full route. 5. If the sweeper must return to the same depot it started from, what would you tell the barangay about this map? Processing Questions: 1. In this model, what does a vertex stand for, and what does an edge stand for? 2. Why does counting odd intersections decide whether the sweep can be done without repeating a street? 3. If the barangay wanted the sweeper to start and end at the same depot, what change to the streets would make that possible? | Activity C.1. Making Real-World Connections Purpose: This phase applies Euler's theorem to an authentic routing task: cleaning every street once. It is the in-class rehearsal of the Eulerian analysis in the Performance Task. The task keeps the focus on edges, the streets, not on visiting every intersection. Strategy 1. Model before tracing. Have students label each intersection with its degree on the map first. Only after the degree counts are agreed should they classify and trace. Strategy 2. Tie the math to the decision. Press students to turn the result into advice for the barangay. An Euler path means every street can be swept once, but the sweeper cannot return to the depot unless the two odd intersections are fixed. Answer to the task: 1. Degrees: A = 2, B = 3, C = 2, D = 2, E = 3, F = 2. 2. Two odd intersections, B and E. 3. An Euler path that is not a circuit. 4. The sweep must start at B and end at E, or the reverse. One route is B to A to D to E to F to C to B to E. See Figure 12. 5. With B and E odd, the sweeper cannot return to a single depot. To make a closed route possible, the barangay would need to change the streets so every intersection is even. Figure 12. A worked street-sweeping route |

![](img_p210_1.png)

![](img_p210_2.png)

-----

| C.2. Making Generalization | Facilitating Reflection: PQ1. Intent: read the model. Answer: a vertex is an intersection; an edge is a street. PQ2. Intent: justify the test. Answer: an odd intersection leaves one street-end unpaired, so it can only be a start or a finish, never a clean pass-through. PQ3. Intent: modeling decision. Answer: add or adjust a street so B and E become even, which makes an Euler circuit and lets the sweeper return to the depot. |
|---|---|
| Activity C.2. Wrapping up the Lesson | Activity C. Wrapping up the Lesson |

**The Traversability Web Purpose: This phase states the generalization and marks the limits**

Pull the lesson together. The frame in Figure 13 organizes the main of the lesson. Students put the rule in their own words and see where ideas. Fill the four boxes, then complete the sentences below. the topic goes next.

**Strategy: Have students fill the frame from memory first, then check**

![](img_p211_1.png)

against Figures 4 and 10. Read a few completed sentences aloud to surface wording differences.

**Target conclusion: Stated by students: the traversability of a**

connected graph is decided by the number of odd-degree vertices, with zero giving an Euler circuit, two giving an Euler path, and more than two giving neither. The form can be a sentence, the count rule, or the completed map.

###### Answer to the task: (1) path; circuit. (2) odd. (3) circuit; path;

neither. (4) Fleury's. The completed map is shown below.

![](img_p211_2.png)

**Figure 13. Concept map frame Complete each sentence:**

1. An Euler \_\_\_\_ uses every edge once and may end at a different vertex; an Euler \_\_\_\_ uses every edge once and returns to the start.
2. To decide which a connected graph has, count its \_\_\_\_ vertices.
3. Zero odd means an Euler \_\_\_\_; two odd means an Euler \_\_\_\_; more than two odd means \_\_\_\_.
4. To trace a route without getting stuck, use \_\_\_\_ procedure, which avoids cutting the graph.

###### Processing Questions:

**Figure 14. Completed concept map**

1. In one sentence, how do you decide whether a connected graph can be traced using every edge once?
2. A friend says this lesson is about visiting every place on a map once. Is that right? Where does that idea belong?

-----

###### Facilitating Reflection:

PQ1. Intent: articulate the rule. Answer: count the odd-degree vertices: 0 gives a circuit, 2 gives a path, more than 2 gives neither. PQ2. Intent: mark the boundary. Answer: no; visiting every place once is the Hamiltonian idea, studied in the next lesson, not the Eulerian edge idea here.

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.3. Assessing Learning Outcomes

**Purpose: This check collects evidence on the lesson objectives: the definitions of Euler path and circuit, Euler's theorem by the count of**

odd vertices, and applying the test from a degree list. It carries no figures and no processing questions, by design.

**Answer key, Part I. 1-B, 2-A, 3-A, 4-B, 5-C, 6-C, 7-A. One point each, 7 points total. Answer key, Part II.**

1. (a) Two odd vertices, S and T. (b) Euler path that is not a circuit. (c) It must start at S and end at T, or the reverse. Rubric, 4 points: 1 for the odd count, 2 for the correct classification, 1 for the endpoints.
2. (a) Yes, an Euler path exists because exactly two rooms are odd. (b) Start at one odd room and finish at the other, the lobby and the roof door. (c) No; the two odd rooms must be the endpoints, so the crew cannot return to the start. Rubric, 3 points: 1 for yes with reason, 1 for the endpoints, 1 for the no-return explanation.

**Answer key, Part III.**

1. True. An Euler route reuses no edge, but it may revisit a vertex.
2. False. Odd-degree vertices always come in pairs, so a graph cannot have exactly one.
3. True. All even degrees is the condition for an Euler circuit.
4. False. More than two odd vertices means neither an Euler path nor a circuit.
5. False. All four land areas are odd, so no such walk exists.

**Scoring: Part I 7 points, Part II 7 points, Part III 10 points, for 24 points total. Mastery is 18 of 24, which is 75 percent.** ***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning

###### For Remediation

###### Fix the Route

**Purpose: This activity rebuilds the odd-vertex test for students who did not reach mastery in C.3, by having them catch and correct a wrong**

classification.

**Strategy: Sit with the pair. Have them write every degree on the figure before judging the claim. The error becomes obvious once the two**

odd vertices are marked.

**Answer to the task: Degrees A = 3, B = 2, C = 4, D = 3, E = 2. Odd vertices: A and D. The claim is wrong: with two odd vertices the graph**

has an Euler path, not a circuit, so it cannot return to A. A correct route is A to B to C to D to A to C to E to D, starting at A and ending at D.

###### Facilitating Reflection:

PQ1. Intent: locate the error. Answer: A and D are odd, so any full route must start and end at them; a closed circuit is impossible.

-----

###### For Enhancement

###### Make It Eulerian

**Purpose: This activity extends the rule by having students repair a non-Eulerian graph, previewing the route-balancing idea behind real**

inspection routes without naming it formally.

**Strategy: Let students try freely, then steer them to notice that adding one edge flips the parity of exactly two vertices. Pairing the odd**

vertices is the key move.

**Answer to the task: The graph is the four corners all joined, every vertex degree 3. (1) Add one edge between two of the odd vertices, for**

example a second A to B edge; then A and B become even and C and D stay odd, giving an Euler path from C to D. (2) Add a second edge to a second pair as well, for example C to D; then all four vertices are even and the graph has an Euler circuit. Two added edges are needed because four odd vertices must be paired off, two at a time. Because the graph is already complete, each repair adds a second edge between a pair that is already joined, which makes the result a multigraph. Each parallel edge counts separately toward the degree of its endpoints, which is how it flips their parity. If the task were restricted to simple graphs, this complete graph on four vertices could not be repaired, because no new simple edge can be added.

###### Facilitating Reflection:

PQ1. Intent: connect edges to parity. Answer: each added edge raises two degrees by one, flipping both from odd to even, so pairing the odd vertices removes them two at a time.

**Assigning the modes: Give For Remediation to students who scored below 18 of 24 on C.3 or missed CR2. Give For Enhancement to**

students who reached mastery and want a harder design problem.

|  |  |
|---|---|
| III. CONTENT | Lesson 4.3. Hamiltonian Paths and Circuits |
| IV. OBJECTIVES | At the end of the lesson, the learners are expected to: 1. examine route-planning scenarios where each location must be visited exactly once (e.g., delivery routes, tour planning) to motivate Hamiltonian concepts; 2. define a Hamiltonian path as a path that visits every vertex of a graph exactly once; 3. define a Hamiltonian circuit as a route that visits every vertex exactly once and returns to its starting vertex to close the loop; 4. examine simple graphs of various structures and observe that no simple degree-count test like Euler's theorem decides Hamiltonicity. 5. state Dirac's condition as a sufficient condition: if every vertex of a simple graph on n ≥ 3 vertices has degree at least n/2, then the graph contains a Hamiltonian circuit. 6. apply Dirac's condition to confirm the existence of Hamiltonian circuits in graphs that satisfy it. 7. identify and trace Hamiltonian paths and circuits in given connected graphs. 8. differentiate Eulerian and Hamiltonian paths/circuits based on whether the focus is on edges or vertices, and identify which concept applies in given problem contexts. |
| V. PROCEDURES | LEARNERS ACTIVITIES ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Activity A.1. Leveling Learners Readiness Walking Every Campus Pathway |

-----

You have learned that a graph is a set of vertices joined by edges. In the last lesson you also studied Eulerian paths and circuits, which use every edge of a graph exactly once. Recall those ideas before starting the new lesson. Figure 1 shows a simple map of your school campus. Each vertex is a place on campus and each edge is a walking pathway between two places.

###### Purpose: Surface the prior knowledge needed for B.1 and B.2. The

named prerequisites are vertex, edge, degree, and the Eulerian path idea from LE4.2. This is a recall check, not a discovery task.

Activate prior knowledge through a short individual attempt followed by pair comparison.

![](img_p214_1.png)

**Figure 1**

| Materials: | A campus pathway map for recalling vertices, edges, and degree. | 1. PQ1 checks recall of graph modeling. Answer: we drew one vertex 2. PQ2 checks degree counting. Answer: G and L have odd degree. |
|---|---|---|
| ● | Printed or drawn copy of the campus pathway map | 3. PQ3 links to Eulerian paths. Answer: yes, a walk using every |
| ● | Pencil and eraser | pathway once is possible, and it must start and end at the two odd- |

###### Instructions:

1. List the vertices and the edges of the network in Figure 1.
2. Write the degree of each vertex.
3. Try to walk along every pathway exactly once. You may start at any place.

###### Processing Questions:

1. How did we represent a real map as a graph in the last lesson?
2. Which vertices have an odd degree?
3. Were you able to walk along every pathway exactly once? Where did you start and end?

###### Strategy: Quick Recall and Pair Check

###### Procedure for the teacher:

1. Display Figure 1 and ask learners to list vertices and edges.
2. Have learners compute each degree and compare answers with a seatmate.
3. Ask a few learners to trace a walk that uses every pathway once.

###### Answer to the task: The vertices are G, C, L, H, R, and O. The edges

are GC, CL, LH, HR, RO, OG, and GL. The degrees are G = 3, C = 2, L = 3, H = 2, R = 2, and O = 2. Exactly two vertices, G and L, have odd degree, so an Eulerian path exists but an Eulerian circuit does not. One such path is G to C to L to H to R to O to G to L, which starts at the Gate and ends at the Library.

###### Facilitating Reflection:

for each place and one edge for each direct pathway.

degree vertices G and L, the Gate and the Library.

-----

###### A.2. Establishing the Purpose of the Lesson

###### Activity A.2. Appreciating Lesson Relevance Touring Every Campus Building

Look again at the same campus map from Activity A.1, now shown in Figure 2. This time the question changes. You want to start at the Gate, visit every place on campus exactly once, and return to the Gate, without passing through any place twice. The pathways are the same as before. Try to plan such a campus tour.

![](img_p215_1.png)

**Figure 2**

*The same campus map from Activity A.1, used here to plan a tour of*

*every place.*

###### Materials:

- Printed or drawn copy of the campus map
- Pencil and eraser

###### Processing Questions:

1. What is this scenario asking you to figure out?
2. Which part of the problem do we not yet have a quick method for?

###### B. Instituting B.1. Presenting Examples

###### New Knowledge Activity B.1. Exploring Key Concepts Which Networks Let You Visit Every Dot Once?

###### Activity A.2. Appreciating Lesson Relevance

**Purpose: Set the purpose of the lesson with one scenario on the same**

campus map from A.1. The goal is a tour that visits every place once and returns to the start. Activity A.1 settled the pathway question with Euler's theorem, but no equally quick rule is known for this tour question. The target term is left for B.2.

###### Strategy: Guided Scenario Walkthrough

Orient learners to the goal and let them try routes by trial so the missing method becomes felt.

###### Procedure for the teacher:

1. Present the campus tour scenario on the same map from A.1 without naming the new concept.
2. Let learners attempt a tour by tracing with a pencil.
3. Ask whether they can be sure a tour exists before trying every route.

**Answer or response to the task: A valid tour exists, for example G**

to C to L to H to R to O and back to G. Learners can find it by trial. They cannot yet justify in advance that such a tour must exist. That gap is the purpose of the lesson.

###### Facilitating Reflection:

1. PQ1 checks purpose. Answer: find a tour that visits each place once and returns to the start.
2. PQ2 surfaces the gap. Answer: we have no quick rule yet, so we can only test routes by hand. This motivates the lesson.

###### Activity B.1. Exploring Key Concepts

**Purpose: Let learners discern the critical feature of the new concept,**

which is a single route through all vertices. The example space varies

-----

Examine the four small networks in Figure 3. For each network, the connection structure while holding the vertex count and try to draw one route that visits every dot exactly once. Then check connectedness constant. whether that route can return to its starting dot. **Example space: Invariant: five locations that are all connected.**

![](img_p216_1.png)

![](img_p216_2.png)

**Figure 3**

*Four five-vertex networks for discerning a route that visits every vertex once.*

###### Worksheet:

For each network, record yes or no in a simple table with three columns: Network; Can you visit every dot once?; Can you also return to the start?

###### Processing Questions:

1. What do Networks 1, 2, and 4 share that Network 3 does not?
2. In which networks could you return to the starting dot? What is different about those networks?
3. What seems to decide whether you can visit every dot exactly **Figure 4** once? *Key Takeaway: No simple count of dots or edges decided in advance* 1. Network 1: visit all once and return, using A to B to C to D to E whether a route through every dot exists, so each network had to be and back to A. checked by hand. Unlike the odd-degree rule that settles Eulerian paths, no equally simple rule is known that settles this for every 2. Network 2: visit all once using A to B to C to D to E, but you graph. cannot return, because the two end dots each connect to only one

Varying: which direct paths exist. Network 1 is a closed cycle. Network 2 is an open path. Network 3 is a star and serves as the nonexample. Network 4 is a square with one peak.

###### Strategy: Compare and Sort

Direct attention to what changes and what stays the same across the four networks.

###### Procedure for the teacher:

1. Have learners attempt a single route through all dots in each network.
2. Ask them to sort the networks by whether the route exists and whether it can close.
3. Use the non-example, Network 3, to draw out why a star blocks a single route.

**Answer to the task: Figure 4 shows the traced routes.**

*Traced routes for the four networks, with the verdict for each.*

neighbor.

-----

| B.2. Discussing the Concept | 3. Network 3: you cannot visit all once, because after reaching any outer dot you must pass through the center again. 4. Network 4: visit all once and return, using E to A to B to C to D and back to E. Facilitating Reflection: 1. PQ1 targets the invariant. Answer: Networks 1, 2, and 4 allow one continuous chain through every dot, while the star forces a return through the center. 2. PQ2 targets closing the route. Answer: you can return only when the route closes into a loop, which happens in Networks 1 and 4. 3. PQ3 names the critical feature. Answer: it depends on whether the connections allow one route through all dots, not on the number of dots. No simple count settles it in advance, unlike the odd-degree rule for Eulerian paths. |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Defining Hamiltonian Paths, Circuits, and Dirac's Test Definitions. A Hamiltonian path is a route in a connected graph that visits every vertex exactly once. A Hamiltonian circuit visits every vertex exactly once before returning to the start; the start reappears only to close the circuit. The focus is on vertices, not on edges. Figure 5 shows a graph with a Hamiltonian path A to B to C to D to E to F. Vertex F connects to only one other vertex, so this route cannot close into a circuit. Figure 5 A worked example of a Hamiltonian path that cannot close into a circuit. | Activity B.2. Deepening Conceptual Understanding Big ideas: Hamiltonian routes count vertices, not edges. A circuit is a path that closes. Dirac's condition is a one-way test that guarantees a circuit but never rules one out. Strategy: Definition Then Example Teach each definition, then anchor it with the matching figure before moving to Dirac's condition. Procedure for the teacher: 1. State the path and circuit definitions, then trace Figures 5 and 6. 2. Use Figure 7 to separate the edge view from the vertex view. 3. State Dirac's condition, then contrast Figure 8, where it holds, with Figure 9, where it fails. Teacher's Technical Note: Dirac's condition requires a simple graph and n at least 3. It gives no information when it fails, so state it as sufficient only. Facilitating Reflection: 1. PQ1 checks the circuit requirement. Answer: a circuit must enter and leave every vertex, so each vertex needs at least two connections; a degree-1 vertex can be entered but not left without reusing an edge. |

-----

Figure 6 shows a graph with a Hamiltonian circuit A to B to C to D 2. PQ2 checks the sufficient-only idea. Answer: Dirac only to E to F and back to A. guarantees and does not forbid, so a circuit can exist below the

bound, as the pentagon V to W to X to Y to Z to V shows.

![](img_p218_1.png)

3. PQ3 checks the contrast. Answer: an Eulerian trail uses every edge once, while a Hamiltonian path visits every vertex once.

**Figure 6**

*A worked example of a Hamiltonian circuit.*

**Relating to Eulerian ideas. An Eulerian trail from the last lesson**

uses every edge once. A Hamiltonian path visits every vertex once. A useful analogy is a street sweeper and a tourist: a street sweeper that must clean every road is solving an Eulerian problem, while a tourist who wants to see every landmark once is solving a Hamiltonian problem. Figure 7 shows the same graph answering

both questions side by side.

![](img_p218_2.png)

**Figure 7**

*The same graph viewed as an Eulerian question and as a Hamiltonian question.*

-----

**Dirac's condition. Unlike Euler's theorem for edges, no simple**

degree-count test like Euler's theorem decides whether a Hamiltonian circuit exists; Dirac's condition is sufficient but not necessary. One useful sufficient test is Dirac's condition: in a simple graph with n vertices, where n is at least 3, if every vertex has degree at least , then the graph has a Hamiltonian circuit.

2

() ≥

2 Figure 8 shows a graph with n = 6, so n/2 = 3. Every vertex has degree 3, which meets the bound, so Dirac guarantees a circuit. One circuit is A to B to C to F to E to D and back to A.

![](img_p219_1.png)

**Figure 8**

*A graph that satisfies Dirac's condition, so a Hamiltonian circuit is guaranteed.*

**A caution. Figure 9 shows a graph with n = 5, so n/2 = 2.5. Vertices**

V and Y have degree 2, which is less than 2.5, so Dirac's condition fails. A circuit still exists, namely V to W to X to Y to Z and back to V. Dirac's condition is sufficient, not necessary. When it fails, you

must inspect the graph by hand.

![](img_p219_2.png)

-----

**Figure 9**

*A graph where Dirac's condition fails yet a Hamiltonian circuit still exists.*

###### Processing Questions:

1. Why does a vertex that connects to only one other vertex make a Hamiltonian circuit impossible?
2. In Figure 9, Dirac's condition fails. Explain why a Hamiltonian circuit can still exist.
3. Explain in your own words the difference between an Eulerian trail and a Hamiltonian path.

***B.3. Developing Mastery (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity B.3. Practicing Learned Skills

**Purpose and variation principle: The guided set uses a five-vertex graph where Dirac's condition holds, so learners practice confirming a**

guaranteed circuit. The independent set uses a six-vertex graph where Dirac's condition fails, so learners must inspect for a circuit the test does not guarantee. The sequence varies whether Dirac applies and the vertex count, not surface difficulty. The minimum success criterion before C.1 is a correct degree list, a correct Dirac judgment, and one correct circuit for each network.

###### Strategy: I Do, We Do, You Do

Model the guided set, work it together, then release the independent set for solo work.

###### Procedure for the teacher:

1. Model the degree list and the Dirac check on Network P, then trace the guaranteed circuit.
2. Work the circuit on Network P with the class to show the closing edge.
3. Release Network Q for independent work and check inspection routes.

**Answer to the task: Guided, Network P: degrees A = 3, B = 3, C = 4, D = 3, E = 3. Here n = 5, so n/2 = 2.5, and every vertex has degree at**

least 3, so Dirac's condition holds and a Hamiltonian circuit is guaranteed. One circuit is A to B to C to D to E and back to A. Figure 12 shows the solution.

![](img_p220_1.png)

-----

|  | Figure Worked solution for Network P, Independent, Network Q: n = 6, so n/2 = 3. Degrees are A = 3, B = 2, below 3, Dirac's condition does not guarantee a circuit. By inspection and back to A. Figure 13 shows the solution. Figure Worked solution for Network Q, where Facilitating Reflection: 1. PQ1 names the strategy. Answer: list degrees, check Dirac, and 2. PQ2 names the transfer. Answer: both networks hide a full outer | 12 where Dirac's condition holds. C = 3, D = 3, E = 2, F = 3. Because B and E have degree 2, which is a Hamiltonian circuit still exists, namely A to B to C to D to E to F 13 Dirac's condition fails but a circuit exists. when it does not guarantee a circuit, inspect the outer cycle first. loop, and the chords or the extra vertex do not block it. |
|---|---|---|
| C. | C.1. Finding Practical Application |  |
| Demonstrating Knowledge and Skills | Activity C.1. Making Real-World Connections Water Route Optimizers A barangay wants one inspection route for its water network. The route should start at the Water Treatment Plant, labeled W, visit every sitio from A to E exactly once, and return to W. Figure 14 shows which points have a direct pipe. | Activity C.1. Making Real-World Connections Purpose: Apply the concept in an authentic context. This task scaffolds the unit performance task, specifically Criterion C2 and sub-deliverable 4, where groups analyze a barangay network for Eulerian and Hamiltonian routes. Strategy: Model Then Justify Guide the modeling cycle and require learners to justify why the chosen route fits the context. Procedure for the teacher: 1. Have learners list degrees and check Dirac's condition for the plant and sitios. |

![](img_p221_1.png)

-----

![](img_p222_1.png)

| Figure 14 A barangay water distribution network with a plant W and five sitios. Worksheet: Record your route in a simple table with three columns: Step; Vertex visited; Pipe used. Instructions: 1. List the degree of each point. 2. Check Dirac's condition. State n, then n/2, then the degrees. 3. Find an inspection route that visits every point once and returns to W, or explain why none exists. Processing Questions: 1. Which assumption did you make about the pipes, and how did it affect your route? 2. Dirac's condition fails here. How did you still decide that a route exists? 3. What would change if the plant W had only one pipe? | 2. Ask learners to inspect the outer loop when Dirac's condition fails. 3. Require a stated assumption about whether pipes are two-way. Answer to the task: Degrees are W = 2, A = 3, B = 3, C = 4, D = 3, and E = 3. Here n = 6, so n/2 = 3. The plant W has degree 2, which is below 3, so Dirac's condition does not guarantee a circuit. By inspection a Hamiltonian circuit exists, namely W to A to B to C to D to E and back to W. Figure 15 shows the solution. Figure 15 Worked solution for the water network inspection route. Facilitating Reflection: 1. PQ1 surfaces a modeling choice. Answer: assume each pipe is two-way, which lets the route use any pipe in either direction. 2. PQ2 reinforces the sufficient-only idea. Answer: Dirac only guarantees, so inspect the outer loop, which visits every point once and returns to W. 3. PQ3 probes the limit. Answer: if W had one pipe, no circuit could pass through it, and only an open route would be possible. |
|---|---|
| C.2. Making Generalization |  |
| Activity C.2. Wrapping up the Lesson Saying the Rule in Our Own Words In your own words, state what a Hamiltonian path and a Hamiltonian circuit are. Then state what Dirac's condition does and does not tell you. | Activity C.2. Wrapping up the Lesson Target conclusion in final form: Learners should state, in words, that a Hamiltonian path visits every vertex once and a Hamiltonian circuit also returns to the start, that an Eulerian trail uses every edge once, and that Dirac's condition guarantees a circuit when every vertex has degree at least n/2 but does not rule one out when it fails. Figure 16 shows this summary. |

![](img_p222_2.png)

-----

###### Processing Questions:

1. In one sentence, what is the difference between an Eulerian trail and a Hamiltonian path?
2. What does Dirac's condition guarantee, and what does it not guarantee?
3. When Dirac's condition fails, what must you do?

**Boundary of the conclusion: The conclusion does not give a way to**

confirm that no Hamiltonian circuit exists. Dirac's condition only guarantees a circuit when it holds. When it fails, learners must inspect, and a search that does not find a circuit does not prove that none exists unless a clear blocker is present, such as a degree-1 vertex or a disconnected graph. The lesson gives no general necessary-and-sufficient test for Hamiltonicity.

![](img_p223_1.png)

**Figure 16**

*Summary of Hamiltonian paths, circuits, and Dirac's condition.*

###### Strategy: Think, Pair, Share to a Class Statement

Elicit the conclusion from learners rather than stating it for them.

###### Procedure for the teacher:

1. Ask the eliciting prompt: in one or two sentences, what did we learn today about visiting every place once?
2. Use the fallback prompt when a statement is partial: does your rule say what happens when Dirac's condition fails?

**Answer to the task: The target statement above is the expected**

conclusion, given in words and supported by the summary in Figure 16.

###### Facilitating Reflection:

1. PQ1 Answer: an Eulerian trail counts edges, while a Hamiltonian path counts vertices.

-----

2. PQ2 Answer: it guarantees a circuit when the degree bound holds, and it does not guarantee the absence of a circuit when the bound fails.
3. PQ3 Answer: inspect the graph by hand for a route.

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.3. Assessing Learning Outcomes Answer Key:

**Part I. 1 B, 2 C, 3 B, 4 B, 5 B, 6 B. Part II.**

1. Degrees: A = 2, B = 2, C = 3, D = 2, E = 3. Here n = 5, so n/2 = 2.5. Three vertices, A, B, and D, have degree 2, which is below 2.5, so Dirac's condition is not satisfied. A Hamiltonian circuit still exists, namely A to B to C to D to E and back to A.
2. It is Hamiltonian because the driver visits every stop, that is every vertex, once, and it is a circuit because the driver returns to the depot. It is not Eulerian, because the task is not about using every road once. A limitation of Dirac's condition is that it is sufficient only, so its failure does not prove that no route exists.

**Part III. 1 False, a path need not return to its start. 2 True, two odd-degree vertices give an Eulerian path. 3 False, the condition is**

sufficient only. 4 False, a circuit needs every vertex to have degree at least 2. 5 True, a circuit on n vertices uses n edges.

**Rubric for the constructed-response items: Score each constructed-response item from 0 to 4. Award 4 for a fully correct and justified**

answer, 3 for a correct answer with a minor gap, 2 for a partially correct answer, 1 for a relevant but mostly incorrect attempt, and 0 for no creditable work. For item 1, the four marks are degrees, the n/2 value, the Dirac judgment, and a correct circuit. For item 2, the four marks are the vertex focus, the return-to-start point, the contrast with Eulerian, and the stated limitation.

**Scoring approach and total points: Part I has 6 items at 1 point each, for 6 points. Part II has 2 items at 4 points each, for 8 points. Part**

III has 5 items at 2 points each, that is 1 point for the correct True or False and 1 point for the reason, for 10 points. The assessment totals 24 points.

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning For Remediation

###### Trace and Tell

**Purpose: Remediation for learners who struggled on C.3. The task isolates the circuit requirement with a clear dead-end vertex.**

###### Strategy: Trace and Narrate

Have learners trace the route aloud and name the vertex that blocks a circuit.

###### Procedure for the teacher:

1. Have learners list degrees and find the path.
2. Ask which vertex has degree 1 and why it blocks a circuit.

**Answer to the task: Degrees are A = 2, B = 3, C = 2, D = 4, and E = 1. Vertex E has degree 1, so no Hamiltonian circuit exists. A Hamiltonian**

path is A to B to C to D to E. Figure 19 shows the solution.

-----

![](img_p225_1.png)

**Figure 19. Worked solution for the remediation network. Facilitating Reflection:**

PQ1 Answer: E has degree 1 and is a dead end, so a circuit cannot pass through it and return.

###### For Enhancement Find the Best Loop

**Purpose: Enrichment and extension for learners who mastered C.3. The task asks for a guaranteed circuit and a comparison of routes. Strategy: Justify and Compare**

Have learners justify the Dirac guarantee, then compare alternative circuits.

###### Procedure for the teacher:

1. Have learners confirm the degree bound for every vertex.
2. Ask for the outer-loop circuit, then a second circuit that uses a chord.

**Answer to the task: Here n = 6, so n/2 = 3. Degrees are A = 4, B = 3, C = 4, D = 3, E = 3, and F = 3, so every vertex meets the bound and**

Dirac's condition holds. A Hamiltonian circuit is A to B to C to D to E to F and back to A. The chords give other circuits, yet the outer loop uses no chords and is the simplest to state. Figure 20 shows one circuit.

![](img_p225_2.png)

-----

**Figure 20. Worked solution for the enhancement network, where Dirac's condition holds. Facilitating Reflection:**

1. PQ1 Answer: every vertex has degree at least 3, which equals n/2, so Dirac's condition guarantees a circuit without any trial.

|  |  |  |
|---|---|---|
| III. CONTENT |  |  |
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. examine connected graphs containing multiple cycles to motivate redundancy; 2. define a tree as a connected acyclic graph; state basic properties 3. define a spanning tree of a connected graph and explain its 4. trace the Breadth-First Search (BFS) algorithm step by step on 5. apply BFS to find a spanning tree of a given connected graph; 6. trace the Depth-First Search (DFS) algorithm step by step on 7. apply DFS to find a spanning tree of a given connected graph. 8. compare BFS and DFS spanning trees on the same graph and | the need for subgraphs that retain connectivity without (a tree on n vertices has n - 1 edges); significance in network design (minimal connectivity); small graphs to identify a spanning tree; small graphs to identify a spanning tree; and explain differences in traversal order. |
| V. PROCEDURES | LEARNERS ACTIVITIES |  |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learner Readiness Reading a Network Again You have studied graphs as vertices joined by edges, and you have traced paths and circuits. Two ideas from those lessons set up today's work. A graph is connected when you can travel between any two vertices. A cycle is a closed loop that returns to where it began. Figure 1 shows a small barangay pathway network. Recall these ideas before the new lesson. |  |

###### Lesson 4.4. Spanning Trees with BFS and DFS

###### ANNOTATION

###### Activity A.1. Leveling Learner Readiness

###### Purpose: Surface the prior knowledge needed for B.1 and B.2. The

and cycle, all from LE4.1 and LE4.2. This is a recall check, not a discovery task.

###### Strategy: Quick Recall and Pair Check

Activate prior knowledge through a short individual attempt followed by pair comparison.

named prerequisites are vertex, edge, neighbor, connected graph,

###### Procedure for the teacher:

1. Display Figure 1 and ask learners to list the vertices and edges.
2. Ask for the neighbors of B and have learners compare with a seatmate.
3. Ask whether the network is connected and have a few learners point to a cycle.

###### If the check reveals a gap: if learners cannot name the neighbors

of a vertex or cannot find a cycle, give a brief re-teach of connected graph and cycle using Figure 1, or refer them to LE4.1 on graph

-----

![](img_p227_1.png)

| Figure 1. A barangay pathway network for recall of connectivity and cycles. Materials: ● Printed or drawn copy of the pathway network ● Pencil and eraser Instructions: 1. List the vertices and the edges of the network in Figure 1. 2. List the neighbors of vertex B, that is, the vertices joined to B by an edge. 3. Decide whether the network is connected, then find one cycle in it. Processing Questions: 1. What does it mean for a graph to be connected? 2. What is a cycle in a graph? 3. The network has more edges than it needs to stay connected. Which edge could you remove and still travel between every pair of vertices? | elements, before starting B.1. If only a few learners struggle, proceed to B.1 and scaffold those learners during the activity. Answer to the task: The vertices are A, B, C, D, and E. The edges are AB, BC, CD, DE, EA, and BE. The neighbors of B are A, C, and E. The network is connected. One cycle is A to B to E and back to A; another is B to C to D to E and back to B. Facilitating Reflection: 1. PQ1 recalls connectivity. Answer: a graph is connected when a route exists between every pair of vertices. 2. PQ2 recalls the cycle. Answer: a cycle is a closed route that returns to its starting vertex without repeating any edge or any other vertex. 3. PQ3 looks ahead to redundancy. Answer: edge BE lies on a cycle, so removing it leaves every vertex connected through the outer loop. The network has six edges but only four are needed to stay connected. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance Cabling the Sitios Without Waste A barangay wants to connect six sitios with internet cable so that every sitio can reach every other sitio. The survey in Figure 2 shows eight possible cable lines. Each line costs the same to install. The barangay wants every sitio connected, but it does not want to pay for lines it does not need. Try to choose a set of lines that keeps all six sitios connected using as few lines as possible. | Activity A.2. Appreciating Lesson Relevance Purpose: Set the purpose of the lesson with one scenario. The goal is a smaller network that keeps every sitio connected with no wasted line. The motivating gap is that learners can see the redundancy but have no rule yet for how many lines are needed or how to choose them. The terms tree and spanning tree are left for B.2. Strategy: Guided Scenario Walkthrough |

-----

![](img_p228_1.png)

|  | Figure 2. Eight possible cable lines among six sitios, with several redundant lines that lie on cycles. Processing Questions: 1. If you keep all eight lines, is any sitio left out? 2. Can you keep every sitio connected after removing some lines? About how many lines do you think you need? | Orient learners to the goal and let them try removing lines so the missing rule becomes felt. Procedure for the teacher: 1. Present the cabling scenario and Figure 2 without naming the new concept. 2. Let learners cross out lines they judge to be redundant. 3. Ask how few lines can still keep all six sitios connected. Answer or response to the task: All eight lines connect every sitio, but several form loops that repeat a connection. Learners can remove a line on a loop and keep the network connected. With six sitios, five well-chosen lines are enough. Learners can find a set by trial. They cannot yet justify that five is the smallest possible. That gap is the purpose of the lesson. Facilitating Reflection: 1. PQ1 checks coverage. Answer: no sitio is left out when all lines are kept; the issue is waste, not coverage. 2. PQ2 checks the motivating gap. Answer: yes, lines on a loop can be removed; about five lines are needed, though learners cannot yet prove it. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Which Networks Are Trees? Examine the four small networks in Figure 3. For each one, check two things. Can you travel between every pair of dots, that is, is it connected? Does the network contain a cycle? A network that is connected and has no cycle is called a tree. | Activity B.1. Exploring Key Concepts Purpose: Let learners discern the two defining features of a tree, connectivity and the absence of a cycle, and notice that a tree on n dots has n - 1 lines. The example space varies structure while holding the dot count constant. Example space: Invariant: small networks on five dots. Varying: whether the network is connected and whether it has a cycle. Network 1 is a tree. Network 2 is connected but has a cycle and is the first non-example. Network 3 has no cycle but is disconnected and is the second non-example. Network 4 is another tree with a different shape. Strategy: Compare and Sort Direct attention to the two tests, connectivity and the cycle, across the four networks. Procedure for the teacher: 1. Have learners test each network for connectivity and for a cycle. 2. Sort the four networks into trees and non-trees. |

-----

![](img_p229_1.png)

3. Use Network 2 and Network 3 to show the two ways a network can fail to be a tree.

**Answer to the task: Figure 4 shows the verdict for each network.**

![](img_p229_2.png)

**Figure 3. Four five-dot networks for sorting into trees and non-trees. Worksheet:**

For each network, record entries in a table with columns: Network; Connected (yes or no); Has a cycle (yes or no); Is it a tree (yes or no).

###### Processing Questions:

1. Which networks are connected? Which networks contain a cycle?
2. Which networks are trees? What do the trees have in common?
3. Count the dots and the lines in each tree. What pattern do you see between the number of dots and the number of lines? *Key Takeaway: A tree is connected and has no cycle. In each tree you* found, the number of lines is one less than the number of dots. A network that has a cycle, or one that is disconnected, is not a tree.

**Figure 4. The verdict for each network, with the reason it is or is not**

*a tree.*

1. Network 1: a tree, connected with no cycle, with five dots and four lines.
2. Network 2: not a tree, because it contains the cycle A to B to C to D and back to A.
3. Network 3: not a tree, because it is disconnected; dots D and E are cut off from A, B, and C.
4. Network 4: a tree, connected with no cycle, with five dots and four lines.

###### Facilitating Reflection:

1. PQ1 targets the two tests. Answer: Networks 1, 2, and 4 are connected; only Network 2 has a cycle.
2. PQ2 targets the definition. Answer: Networks 1 and 4 are trees, because each is connected and has no cycle.
3. PQ3 targets the edge count. Answer: each tree has four lines for five dots, one fewer line than dots.

-----

| B.2. Discussing the Concept |  |
|---|---|
| Activity B.2. Deepening Conceptual Understanding Trees, Spanning Trees, and Two Ways to Find Them A tree is a connected graph with no cycle. A short fact follows from that definition: a tree on n vertices has exactly n - 1 edges, no more and no fewer. A spanning tree of a connected graph is a subgraph that is a tree and that includes every vertex of the graph. Figure 5 shows one spanning tree of the sitio network. The green lines form a tree that reaches all six sitios using only five lines. Figure 5. One spanning tree of a connected graph, shown in green over the full graph. Why a spanning tree matters. A spanning tree is the smallest network that keeps every vertex connected. Remove any one of its edges and the network splits into two pieces. Add any other edge of the original graph and you form a cycle, which is the redundancy the barangay wanted to avoid in A.2. This is why network designers use spanning trees to connect locations at least cost. A useful analogy is a backbone: the spanning tree is the minimal backbone that ties every stop together, and every extra line is a convenience, not a necessity. Breadth-First Search. Two algorithms build a spanning tree by exploring the graph from a chosen start vertex, called the root. Throughout, when a vertex has more than one unvisited neighbor, visit those neighbors in alphabetical order. Breadth-First Search, or BFS, explores level by level using a queue. Put the root in the queue. Take the front vertex out, visit its unvisited neighbors in alphabetical order, and add them to the back of the queue. Repeat until the queue is empty. The edge that first reaches each vertex becomes a tree edge. | Activity B.2. Deepening Conceptual Understanding Big ideas: A tree is connected and acyclic, and a tree on n vertices has exactly n - 1 edges. A spanning tree reaches every vertex of a connected graph with the fewest possible edges. BFS and DFS each build a spanning tree from a chosen root, and they can choose different edges. Strategy: Define Then Trace State each definition, then build a spanning tree live with BFS and again with DFS so the procedures are seen, not only described. Procedure for the teacher: 1. Define tree, the n - 1 edge count, and spanning tree using Figure 5. 2. State the alphabetical-neighbor convention, then trace BFS on Figure 6, reading the queue aloud. 3. Trace DFS on Figure 7, reading the backtracking aloud, then compare the two with Figure 8. Teacher's Technical Note: BFS and DFS results depend on the root and on the order neighbors are visited. Fix the root and the alphabetical order before tracing, or different learners will produce different trees that are each correct. Facilitating Reflection: 1. PQ1 checks the edge count. Answer: a tree on n vertices always has n - 1 edges, and a spanning tree is a tree on all n vertices. 2. PQ2 checks the cycle. Answer: the spanning tree already joins the two endpoints, so a second edge between them closes a loop. 3. PQ3 checks the comparison. Answer: the two searches visit neighbors in a different order, so they first reach some vertices through different edges. |

![](img_p230_1.png)

-----

Figure 6 shows BFS from A. The badges give the order the vertices are reached: A, then B and C, then D, E, and F.

![](img_p231_1.png)

**Figure 6. A BFS spanning tree from A, with badges showing the**

*order vertices are reached.*

###### Step-by-step BFS trace:

1. Start: visit A and place it in the queue. Queue: A.
2. Take A out. Its unvisited neighbors are B and C. Visit both and add edges AB and AC. Queue: B, C.
3. Take B out. Its only unvisited neighbor is D. Add edge BD. Queue: C, D.
4. Take C out. Its only unvisited neighbor is E. Add edge CE. Queue: D, E.
5. Take D out. Its only unvisited neighbor is F. Add edge DF. Queue: E, F.
6. Take E, then F. Neither has an unvisited neighbor. The queue empties and the tree AB, AC, BD, CE, DF is complete.

**Depth-First Search. Depth-First Search, or DFS, explores as deep as**

possible before backing up, using a stack that you can picture as the trail you can walk back along. From the current vertex, move to its first unvisited neighbor in alphabetical order, and keep going deeper. When a vertex has no unvisited neighbor, back up to the previous vertex and try its next neighbor. Figure 7 shows DFS from A. The order is A, B, C, E, D, F.

-----

![](img_p232_1.png)

**Figure 7. A DFS spanning tree from A, with badges showing the**

*order vertices are reached.*

###### Step-by-step DFS trace:

1. Visit A, then go deeper to its first neighbor B. Add edge AB.
2. From B, go deeper to C. Add edge BC.
3. From C, go deeper to E. Add edge CE.
4. From E, go deeper to D. Add edge DE.
5. From D, go deeper to F. Add edge DF.
6. F has no unvisited neighbor, so back up through D, E, C, B, and A. The tree AB, BC, CE, DE, DF is complete.

**Comparing the two. Both searches reach every vertex, so both**

produce a spanning tree with n - 1 edges. They can choose different edges. Figure 8 places the two trees side by side. BFS used AC and BD; DFS used BC and DE in their place. The trees differ because BFS spreads out level by level while DFS commits to one deep branch first.

-----

![](img_p233_1.png)

| Figure 8. The BFS tree and the DFS tree of the same graph, side by side. Processing Questions: 1. Why must a spanning tree of a graph on n vertices have exactly n - 1 edges? 2. Why does adding any non-tree edge to a spanning tree create a cycle? 3. BFS and DFS started at the same vertex yet produced different trees. Explain how that is possible. |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Purpose and variation principle: The guided set models BFS on network and compare. Using one network for both makes the difference success criterion before C.1 is a correct visit order and a correct edge Strategy: I Do, We Do, You Do Run BFS together, then release DFS and the comparison for independent Procedure for the teacher: 1. Build the alphabetical neighbor list with the class. 2. Run BFS from A, reading the queue aloud. 3. Release DFS and the comparison for independent work. Answer to the task: Neighbors in alphabetical order: A: B, C. B: A, D, Guided, BFS from A: order A, B, C, D, E, F, G. The BFS tree edges are | Learned Skills Network R. The independent set has learners run DFS on the same between the two trees visible, which is objective 8. The minimum list for each search, plus one correctly named differing edge. work. E. C: A, E, F. D: B. E: B, C, G. F: C, G. G: E, F. AB, AC, BD, BE, CF, and EG. Figure 10 shows the solution. |

-----

![](img_p234_1.png)

**Figure 10. The BFS spanning tree of Network R from A.**

Independent, DFS from A: order A, B, D, E, C, F, G. The DFS tree edges are AB, BD, BE, CE, CF, and FG. Figure 11 shows the solution. The two trees differ: the BFS tree used AC and EG, while the DFS tree used CE and FG.

![](img_p234_2.png)

###### Facilitating Reflection:

1. PQ1 names the BFS rule. Answer: the queue serves vertices in the order they were added, so BFS finishes a whole level before moving on.
2. PQ2 names the difference. Answer: the trees disagree on AC versus CE and on EG versus FG, because DFS reached C and G through a deep branch rather than level by level.

###### C. C.1. Finding Practical Application

**Demonstrating Activity C.1. Making Real-World Connections Knowledge and Skills Wiring the Sitios at Least Cost**

A barangay must connect six sitios, A through F, with electric line. Figure 12 shows the lines the terrain allows. Each line costs the same to install. The barangay wants every sitio powered, with no wasted line. Use a spanning tree to choose the lines. Start at sitio A and visit neighbors in alphabetical order.

| Figure 11. The DFS spanning | tree of Network R from A. |
|---|---|
|  | Activity C.1. Making Real-World Connections Purpose: Transfer the spanning-tree idea to an authentic least-cost wiring task. This activity scaffolds PT sub-deliverable 5 and Criterion C3, where groups construct a spanning tree using BFS and DFS, and it rehearses the BFS computation graded in Criterion C4. Strategy: Model Then Justify |

-----

![](img_p235_1.png)

**Figure 12. The lines the terrain allows among six sitios.** installs AB, AD, BC, BE, and CF, which is five lines. Figure 13 shows **Worksheet:** the solution. Five lines connect six sitios because a spanning tree Record the neighbor list, the BFS visit order, the lines you install, and the number of lines. **Instructions:** five lines at the same total cost, so all spanning trees are tied for

1. List the neighbors of each sitio in alphabetical order. least cost. BFS selects one valid spanning tree; it is not solving a
2. Run BFS from A to choose the lines, then list them. if the lines had different costs.
3. State how many lines you install and explain why no line is

![](img_p235_2.png)

wasted.

###### Processing Questions:

1. Why does your set of lines have exactly five lines?
2. The barangay later asks to add a backup line. What happens to the network when you add one more line?
3. Would starting at a different sitio change the number of lines you install? Would it change which lines?

Run BFS to choose the lines, then have learners justify the line count and the no-waste claim.

###### Procedure for the teacher:

1. Build the alphabetical neighbor list with the class.
2. Run BFS from A and mark the chosen lines.
3. Have learners justify the five lines and the absence of a loop.

**Answer to the task: Neighbors: A: B, D. B: A, C, D, E. C: B, F. D:**

A, B, E. E: B, D, F. F: C, E. BFS from A reaches A, B, D, C, E, F and on n sitios has n - 1 lines. No line is wasted, because removing any one would cut off a sitio and adding any other would form a loop. Because every line costs the same here, every spanning tree installs weighted minimum-spanning-tree problem, which would arise only

**Figure 13. The BFS spanning tree that wires all six sitios with five**

*lines.*

###### Facilitating Reflection:

1. PQ1 checks the count. Answer: five lines, because a spanning tree on six sitios has 6 - 1 = 5 edges.
2. PQ2 checks redundancy. Answer: adding a line forms a loop, which is a repeated connection rather than new coverage.
3. PQ3 checks invariance. Answer: a different start can change which lines are chosen, but never the count, which is always n - 1.

-----

| C.2. Making Generalization |  |
|---|---|
| Activity C.2. Wrapping up the Lesson What We Can Now Say About Trees and Searches In your own words, write three short statements: what makes a graph a tree, what a spanning tree is and why it is useful, and how BFS and DFS differ when they build a spanning tree. Processing Questions: 1. In one sentence, what is a spanning tree? 2. Why does a spanning tree on n vertices always have n - 1 edges? 3. When do BFS and DFS give the same tree, and when do they differ? | Activity C.2. Wrapping up the Lesson Target conclusion in final form: Learners should state that a tree is a connected graph with no cycle and that a tree on n vertices has n - 1 edges; that a spanning tree of a connected graph is a tree that includes every vertex and connects them with the fewest edges; and that BFS and DFS both build spanning trees but may choose different edges, because BFS explores level by level while DFS goes as deep as possible. Figure 14 shows a looped graph beside one of its spanning trees. Boundary of the conclusion: The lesson does not claim that a graph has only one spanning tree; most graphs have many. It does not say which spanning tree is cheapest when edges carry different costs; that is the minimum-spanning-tree problem, which this lesson does not cover. It also does not address the shortest path between two vertices, which is the next lesson. Strategy: Think-Pair-Share Elicit the three statements from pairs, then refine the wording with the class. Procedure for the teacher: 1. Eliciting prompt: ask a pair to state what a spanning tree is and how many edges it has. 2. Fallback prompt: if a pair says a spanning tree is any connected subgraph, ask them to check Figure 14 and count whether their subgraph has a cycle. 3. Collect the three statements and refine them into the target wording. Answer to the task: Figure 14 places a looped graph beside one of its spanning trees. |

-----

![](img_p237_1.png)

***C.3. Evaluating Learning (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Answer Key:

Part I: 1. A. 2. A. 3. A. 4. A. 5. A. 6. B. Part II item 1: BFS from A visits A, B, C, D, E. The BFS tree edges are AB, AC, BD, and CE. Part II item 2: DFS from A visits A, B, D, C, E. The DFS tree edges are AB, BD, CD, and CE. Edge AC is in the BFS tree but not the DFS tree. Part III: 1. False, a tree is acyclic by definition. 2. True, a spanning tree on n vertices has n - 1 edges, and 7 - 1 = 6. 3. True, the tree already joins the two endpoints, so a further edge closes a loop. 4. False, the two searches may choose different edges. 5. False, a spanning tree must reach every vertex, which requires the graph to be connected.

###### Rubric for each constructed-response item (0 to 4):

- 4: correct visit order and correct edge list, with the differing edge correctly named in item 2.
- 3: correct method with one wrong or missing edge.
- 2: correct start and partial order, but the tree is incomplete.
- 1: an attempt that does not follow the stated order.
- 0: no response or unrelated work.

|  | Figure 14. A graph with cycles beside one of its spanning trees. Facilitating Reflection: 1. PQ1. Answer: a spanning tree is a tree that includes every vertex of a connected graph. 2. PQ2. Answer: a spanning tree is a tree on all n vertices, and every tree on n vertices has n - 1 edges. 3. PQ3. Answer: they give the same tree when the graph is itself a tree, since then only one spanning tree exists; they differ when the graph has cycles, because the two searches choose different edges. |
|---|---|
| Activity C.3. Assessing | Learning Outcomes |

-----

| Scoring: Part I, six items at 1 point each, 6 points. Part II, two items at 4 points each, 8 points. Part III, five items at 2 points each, 10 points. Total 24 points. |
|---|
| C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.) |
| Activity C.4. Extending and Reinforcing Learning For Remediation Purpose: Rebuild the BFS procedure on a small graph for learners who struggled in C.3. Strategy: Trace Together Walk the queue one step at a time and name each tree edge as it is added. Procedure for the teacher: 1. Build the neighbor list with the learner. 2. Run BFS from A, adding one tree edge at a time. 3. Count the edges and compare with the number of vertices. Answer to the task: Neighbors: A: B, C. B: A, D. C: A, D. D: B, C, E. E: D. BFS from A reaches A, B, C, D, E. The BFS tree edges are AB, AC, BD, and DE, which is four edges. Figure 16 shows the solution. |

![](img_p238_1.png)

**Figure 16. The BFS spanning tree for the remediation network. Facilitating Reflection:**

1. PQ1. Answer: four edges for five vertices, one fewer edge than the number of vertices, which is the n - 1 rule.

###### For Enhancement Purpose: Stretch confident learners to compare the two searches on a denser graph. Strategy: Run and Contrast

Have learners build both trees, then list the edges where the trees disagree.

###### Procedure for the teacher:

1. Have learners run BFS and DFS from A.

-----

|  | 2. Have them list the edges of each tree. 3. Have them mark the edges that differ. Answer to the task: BFS from A gives the tree AB, AD, BC, BE, differ: BFS used AD and BE, while DFS used DE and EF. Figure 18 Figure 18. The BFS and DFS spanning trees | and CF. DFS from A gives the tree AB, BC, CF, EF, and DE. The trees shows both trees side by side. of the enhancement network, side by side. |
|---|---|---|
| III. CONTENT | Lesson 4.5. Shortest Paths with | Dijkstra and Floyd-Warshall |
| IV. OBJECTIVES | By the end of the lesson, the learners are able to: 1. examine weighted graphs in real-world contexts (road networks, problems; 2. define a weighted graph and the length (or weight) of a path; 3. state the shortest-path problem in single-source and all-pairs 4. trace Dijkstra's algorithm step by step on small weighted graphs 5. apply Dijkstra's algorithm to find shortest paths from a source 6. trace the Floyd-Warshall algorithm step by step on small weighted 7. apply the Floyd-Warshall algorithm to find shortest paths 8. compare Dijkstra's and Floyd-Warshall algorithms in terms of conditions (non-negative vs general), and computational | communication networks, logistics) to motivate shortest-path forms; with non-negative edge weights; vertex to all other vertices; graphs; between all pairs of vertices; and input requirements (single-source vs all-pairs), edge-weight efficiency. |
| V. PROCEDURES | LEARNERS ACTIVITIES | ANNOTATION |
| A. Activating | A.1. Eliciting Prior Knowledge |  |
| Prior Knowledge | Activity A.1. Leveling Learners Readiness Routes and Their Lengths You have studied graphs and traced paths through them. A path is a route through a graph, and two vertices can have more than one route between them. Figure 1 shows a footpath network with two routes from A to E. Recall how routes work before the new lesson. | Activity A.1. Leveling Learners Readiness Purpose: Surface the prior knowledge needed for B.1 and B.2. The named prerequisites are vertex, edge, path, and adding values along a route, all from LE4.1 and LE4.2. This is a recall check, not a discovery task. Strategy: Quick Recall and Pair Check |

-----

![](img_p240_1.png)

| Figure 1. A footpath network with more than one route from A to E. Materials: ● Printed or drawn copy of the footpath network ● Pencil and eraser Instructions: 1. Name one route from A to E. 2. Name a second, different route from A to E. 3. Count the number of footpaths (edges) in each route. Processing Questions: 1. What is a path in a graph? 2. Can two vertices have more than one route between them? 3. If each footpath had a length in meters, how would you find the total length of a route? | Activate prior knowledge through a short individual attempt followed by pair comparison. Procedure for the teacher: 1. Display Figure 1 and ask learners to name a route from A to E. 2. Ask for a second, different route and have learners compare with a seatmate. 3. Have learners count the footpaths in each route. Answer to the task: One route from A to E is A to B to E. A second route is A to B to C to D to E. The first uses two footpaths; the second uses four. Other routes are possible. Facilitating Reflection: 1. PQ1 recalls the path. Answer: a path is a route through the graph that joins vertices by edges without repeating a vertex. 2. PQ2 recalls multiple routes. Answer: yes, two vertices can be joined by several different routes. 3. PQ3 bridges to weights. Answer: you would add the lengths of the footpaths along the route to get its total length. |
|---|---|
| A.2. Establishing the Purpose of the Lesson |  |
| Activity A.2. Appreciating Lesson Relevance The Budget Backpacker You are a tourist starting at the Main City, and you want to reach the Beach for a vacation. You have a limited budget. Figure 2 shows the bus fare, in pesos, on each road between places. Each road can be travelled both ways for the same fare. Find the cheapest way from the Main City to the Beach. | Activity A.2. Appreciating Lesson Relevance Purpose: Set the purpose of the lesson with one budget scenario. The goal is the cheapest route from the Main City to the Beach. The motivating gap is that learners can total a few routes by trial but have no method yet to be sure they have found the cheapest, especially as the map grows. The terms weighted graph and shortest path are left for B.2. Strategy: Guided Scenario Walkthrough Orient learners to the budget goal and let them try routes so the missing method becomes felt. Procedure for the teacher: |

-----

![](img_p241_1.png)

|  | Figure 2. Bus fares in pesos on the roads between places on the way to the Beach. Processing Questions: 1. What is this scenario asking us to find? 2. If your budget is 70 pesos, can you still reach the Beach? | 1. Present the budget-trip scenario and Figure 2 without naming the new concept. 2. Let learners total the fare of a few routes from the Main City to the Beach. 3. Ask whether they can be sure their route is the cheapest, and whether 70 pesos is enough. Answer or response to the task: The cheapest route is Main City to Museum to Church to Beach, which costs 24 + 16 + 20 = 60 pesos. The routes with fewer stops cost more: Main City to Mountain Peak to Beach costs 78, and Main City to Waterfalls to Beach costs 84. With 70 pesos, only the 60-peso route is affordable. Learners can find this by trial. They have no method yet to guarantee the cheapest. That gap motivates the lesson. Facilitating Reflection: 1. PQ1 checks the goal. Answer: the route from the Main City to the Beach with the smallest total fare. 2. PQ2 checks the budget. Answer: yes, on 70 pesos, but only by the 60-peso route through the Museum and Church; the routes with fewer stops cost more than 70. |
|---|---|---|
| B. Instituting | B.1. Presenting Examples |  |
| New Knowledge | Activity B.1. Exploring Key Concepts Adding Up the Fare A weighted graph is a graph whose edges carry numbers called weights. The length, or weight, of a route is the sum of the weights of its edges. Here each weight is a bus fare. Use Figure 3, the same trip network. Compute the total fare of several routes from the Main City to the Beach. | Activity B.1. Exploring Key Concepts Purpose: Let learners discern two ideas: that the length of a path is the sum of its edge weights, and that the cheapest route by total fare is not always the route with the fewest stops. The example space holds the network and the endpoints fixed and varies the route. Example space: Invariant: the trip network and the endpoints Main City and Beach. Varying: which route is taken, and therefore the total fare. The one-stop routes, through Mountain Peak at 78 and through Waterfalls at 84, are the near-miss non-examples of cheapest. The two-stop route through the Museum and Church at 60 is the cheapest. Strategy: Compute and Compare Have learners total each route, then compare totals to discern what shortest means. Procedure for the teacher: 1. Define weight and the length of a path, using fare as the weight. 2. Have learners total each of the three routes. 3. Compare the totals and connect them to the A.2 budget scenario. |

-----

![](img_p242_1.png)

![](img_p242_2.png)

**Figure 3. The trip network for computing the total fare of routes to the**

*Beach.*

###### Worksheet:

Total the fare for each route, then fill in the blank cells.

| Route |  |
|---|---|
| Main City to Mtn. Peak to Beach |  |
| Main City to Museum to Church to Beach |  |
| Main City to Waterfalls to Beach |  |

###### Processing Questions:

1. How do you find the total fare of a route?
2. Which route is the cheapest by total fare?
3. The cheapest route has more stops than some of the others. What does this tell you about the word shortest?

*Key Takeaway: The length of a path is the sum of its edge weights,* which here is the total fare. The cheapest route has the least total fare, which is not always the route with the fewest stops.

###### B.2. Discussing the Concept

###### Activity B.2. Deepening Conceptual Understanding Two Algorithms for Shortest Paths

A weighted graph has a number on each edge, its weight, which often stands for a distance, a time, or a cost. The length of a path is the sum of its edge weights. The shortest-path problem asks for the path of least total weight. It comes in two forms. The single-source form asks for the shortest path from one source vertex to every other

**Answer to the task: Main City to Mountain Peak to Beach totals 78.**

Main City to Museum to Church to Beach totals 60. Main City to Waterfalls to Beach totals 84. The cheapest is the Museum and Church route at 60. Figure 4 shows it.

**Roads used Total fare Figure 4. The cheapest route from the Main City to the Beach by total**

*fare.*

###### Facilitating Reflection:

1. PQ1 targets the definition. Answer: add the fares of the roads along the route.
2. PQ2 targets the comparison. Answer: the route through the Museum and Church, at 60 pesos.
3. PQ3 targets the key idea. Answer: the cheapest route has more stops than the one-stop routes but a smaller total, so shortest means least total weight, not fewest stops.

###### Activity B.2. Deepening Conceptual Understanding

**Big ideas: A weighted graph carries a weight on each edge, and the**

length of a path is the sum of those weights. The shortest-path problem has a single-source form and an all-pairs form. Dijkstra solves the single-source problem for non-negative weights. Floyd- Warshall solves the all-pairs problem for general weights with no negative cycle.

-----

vertex. The all-pairs form asks for the shortest path between every pair of vertices.

**Dijkstra's algorithm. Dijkstra's algorithm solves the single-source**

problem when no weight is negative. Give each vertex a tentative distance from the source, 0 for the source and infinity for the rest. Then repeat two steps. Finalize the unfinalized vertex with the smallest tentative distance. For each of its neighbors, check whether reaching that neighbor through the finalized vertex is shorter than the neighbor's current tentative distance, and if so, lower it. Stop when every vertex is finalized. Figure 5 shows a weighted graph with source A.

###### Strategy: Define Then Trace

State the definitions, then run Dijkstra live as a tentative-distance trace and run Floyd-Warshall live as matrix updates so both procedures are seen.

###### Procedure for the teacher:

1. Define weighted graph, the length of a path, and the single-source and all-pairs forms.
2. State the non-negative-weight convention and trace Dijkstra on Figure 5, reading the tentative distances at each step.
3. Build the Floyd-Warshall matrix and update it vertex by vertex on

![](img_p243_1.png)

Figure 7, then compare the two algorithms with Figure 9.

**Figure 5. A weighted graph for Dijkstra's algorithm, with source A.** is safe to finalize.

###### Step-by-step Dijkstra trace:

1. Start: A = 0; B, C, D, E = infinity. 3. PQ3. Answer: Floyd-Warshall when every pair is needed or a
2. Finalize A. Update neighbors: B = 2, C = 5. are non-negative.
3. Finalize B, the smallest at 2. Update: C = min(5, 2 + 1) = 3; D = 2 + 7 = 9.
4. Finalize C at 3. Update: D = min(9, 3 + 3) = 6; E = 3 + 8 = 11.
5. Finalize D at 6. Update: E = min(11, 6 + 2) = 8.
6. Finalize E at 8. Every vertex is final. Figure 6 shows the result.

*Teacher's Technical Note: Fix the source and the alphabetical tie-* break for Dijkstra, and process Floyd-Warshall's k in alphabetical order, so every trace is reproducible. Treat the graph as undirected, with the same weight in both directions.

###### Facilitating Reflection:

1. PQ1. Answer: with non-negative weights, once a vertex has the smallest tentative distance, no later route can make it smaller, so it
2. PQ2. Answer: it means testing the route from i to k and then from k to j against the current i-to-j entry.

weight is negative; Dijkstra when there is one source and all weights

-----

![](img_p244_1.png)

**Figure 6. Dijkstra result: the shortest distance from A to each vertex,**

*with the shortest-path tree in green.*

Notice that the direct edge A to C has weight 5, but the shortest path from A to C is A to B to C with total 3. The shortest path is not the one with the fewest edges.

**Floyd-Warshall algorithm. The Floyd-Warshall algorithm solves the**

all-pairs problem and works even when some weights are negative, as long as there is no negative cycle. Write the weights in a distance matrix: 0 on the diagonal, the edge weight where an edge exists, and infinity where none does. Then, for each vertex k in turn, ask for every pair of vertices i and j whether going from i to j through k is shorter than the current entry, and if so, replace it. After every vertex has served as k, the matrix holds the shortest distance for every pair. This matrix records distances only. To recover the actual route between two vertices, keep a companion next-vertex table while you update the matrix, then follow that table from the start vertex to read off the path. Figure 7 shows a four-vertex weighted graph.

-----

![](img_p245_1.png)

**Figure 7. A four-vertex weighted graph for the Floyd-Warshall**

*algorithm.*

###### Step-by-step Floyd-Warshall trace:

1. Start with the initial matrix: 0 on the diagonal, the given weights, and infinity for missing edges.
2. Through A: B to D becomes 3 + 7 = 10.
3. Through B: A to C becomes 3 + 1 = 4.
4. Through C: A to D becomes 4 + 2 = 6; B to D becomes 1 + 2 = 3.
5. Through D: no entry improves. Figure 8 shows the start and final matrices.

![](img_p245_2.png)

**Figure 8. The initial matrix and the final all-pairs matrix from Floyd-**

*Warshall.*

**Comparing the two. The two algorithms answer different questions.**

Dijkstra finds the shortest paths from one source and needs nonnegative weights. Floyd-Warshall finds the shortest path between every pair and tolerates general weights as long as there is no negative cycle. For a single source, Dijkstra does less work. When every pair is needed, the one matrix from Floyd-Warshall is convenient. The effort

-----

| differs too: Dijkstra targets one starting point, while Floyd-Warshall fills the whole table, so its effort grows quickly as the number of vertices increases. If only one shortest distance is needed, a single Dijkstra run is lighter than computing every pair. Figure 9 compares them. An analogy: Dijkstra always extends the cheapest route found so far, one vertex at a time, while Floyd-Warshall asks, for every pair of places, whether adding one more stopover shortens the trip. Figure 9. Dijkstra and Floyd-Warshall compared by what they find, the weights they allow, and their output. Processing Questions: 1. Why does Dijkstra finalize the vertex with the smallest tentative distance first? 2. In Floyd-Warshall, what does it mean to go through k? 3. Give one situation where Floyd-Warshall is the better choice and one where Dijkstra is. |  |
|---|---|
| B.3. Developing Mastery (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity B.3. Practicing Purpose and variation principle: The guided set runs Dijkstra for a the same network, so learners see that the source row of the all-pairs before C.1 is the correct final Dijkstra distances and a correct A-row in Strategy: I Do, We Do, You Do Run Dijkstra together, then release the Floyd-Warshall matrix and the Procedure for the teacher: 1. Run Dijkstra from A with the class, reading the tentative | Learned Skills single source. The independent set runs Floyd-Warshall for all pairs on matrix equals the single-source result. The minimum success criterion the matrix. comparison. distances. |

-----

2. Release the Floyd-Warshall matrix for independent work.
3. Have learners compare the A-row with the Dijkstra distances.

**Answer to the task: Dijkstra from A finalizes A at 0, C at 2, B at 5, D at 6, then E at 10. The final distances are A = 0, B = 5, C = 2, D = 6,**

E = 10. Figure 11 shows the result.

![](img_p247_1.png)

**Figure 11. Network R: the shortest distance from A to each vertex by Dijkstra.**

The Floyd-Warshall matrix gives the all-pairs shortest distances in Figure 12. Its A-row reads 0, 5, 2, 6, 10, which matches the Dijkstra distances from A.

![](img_p247_2.png)

**Figure 12**

*Network R: the all-pairs shortest distances by Floyd-Warshall.*

###### Facilitating Reflection:

1. PQ1. Answer: C is finalized second, because after A the smallest tentative distance is C at 2.
2. PQ2. Answer: the A-row of the all-pairs matrix is exactly the single-source shortest distances from A.
    - Item 2: forgetting to put 0 on the diagonal or infinity for missing edges.
    - Item 3: reading a column instead of the A-row.

-----

| C. | C.1. Finding Practical Application |  |
|---|---|---|
| Demonstratin g Knowledge and Skills | Activity C.1. Making Real-World Connections The Fastest Route Across the Barangay A barangay road map gives the travel time, in minutes, on each road between six points, A through F, where A is the barangay hall and F is the school. Figure 13 shows the times. Find the fastest time from A to every point, and the fastest route from A to the school at F. The source is A; treat the roads as two-way with non-negative times. Figure 13. Barangay road network with travel times in minutes, source A. Worksheet: Record the order in which points are finalized, the shortest time from A to each point, and the fastest route from A to F. Instructions: 1. Run Dijkstra from A. 2. Give the shortest time from A to each point. 3. State the fastest route from A to F and its time. Processing Questions: 1. Which point did Dijkstra finalize last, and what does that tell you? 2. The fastest route from A to F is not the one with the fewest roads. Why can that happen? 3. What would change in your answer if one road were closed? | Activity C.1. Making Real-World Connections Purpose: Transfer Dijkstra's algorithm to an authentic fastest-route task. This activity scaffolds PT sub-deliverable 6, the shortest-path optimization with the school as one endpoint, and it rehearses the algorithm computation graded in Criterion C4. Strategy 1. Model Then Justify Run Dijkstra to find the shortest times, then have learners trace and justify the fastest route to F. Procedure for the teacher: 1. Set the tentative distances and run Dijkstra from A. 2. Read off the shortest time to each point. 3. Trace the fastest route from A to F and justify its time. Answer to the task: Dijkstra from A finalizes A at 0, C at 3, B at 4, D and E at 9, then F at 12. The shortest times are B = 4, C = 3, D = 9, E = 9, F = 12. The fastest route from A to F is A to C to E to F, total 12, which beats A to B to D to F at 4 + 5 + 7 = 16. Figure 14 shows the result. Figure 14. The shortest time from A to each point, with the fastest route to F in green. Facilitating Reflection: 1. PQ1. Answer: F is finalized last at 12, so F is the farthest point from A in travel time. 2. PQ2. Answer: a route with more roads can still have a smaller total time, since shortest means least total weight. 3. PQ3. Answer: closing a road removes an edge, which can lengthen some shortest times or change which route is fastest. |

![](img_p248_1.png)

![](img_p248_2.png)

-----

| C.2. Making Generalization |  |
|---|---|
| Activity C.2. Wrapping up the Lesson What We Can Now Say About Shortest Paths In your own words, write three short statements: what the length of a path is; what the shortest-path problem asks in its two forms; and how Dijkstra and Floyd-Warshall differ. Processing Questions: 1. In one sentence, what is the length of a path? 2. When would you choose Floyd-Warshall over Dijkstra? 3. Does shortest mean the fewest edges? | Activity C.2. Wrapping up the Lesson Target conclusion in final form: Learners should state that the length of a path is the sum of its edge weights; that the shortest-path problem asks for the path of least total weight, in single-source form, one source to all vertices, and all-pairs form, every pair of vertices; and that Dijkstra solves the single-source problem for non-negative weights while Floyd-Warshall solves the all-pairs problem for general weights with no negative cycle. Figure 15 shows a set of given weights beside the resulting shortest distances. Boundary of the conclusion: Dijkstra requires non-negative weights; with a negative edge it can finalize a wrong distance. Floyd- Warshall allows a negative edge but not a negative cycle, since then no shortest path exists. Shortest means least total weight, not fewest edges. This lesson finds shortest distances on small graphs by hand and does not cover the faster methods used for very large networks, nor the minimum spanning tree from LE4.4, which answers a different question. Strategy: Think-Pair-Share Elicit the three statements from pairs, then refine the wording with the class. Procedure for the teacher: 1. Eliciting prompt: ask a pair to state the length of a path and the two forms of the problem. 2. Fallback prompt: if a pair says shortest means fewest edges, point to Figure 6, where A to B to C with total 3 beats the single edge A to C with weight 5. 3. Collect the three statements and refine them into the target wording. Answer to the task: Figure 15 shows the given weights beside the shortest distances they produce. |

-----

![](img_p250_1.png)

|  | Figure 15. From a matrix of given weights to the matrix of shortest distances. Facilitating Reflection: 1. PQ1. Answer: the sum of its edge weights. 2. PQ2. Answer: when every pair of distances is needed, or when a weight is negative and there is no negative cycle. 3. PQ3. Answer: no, shortest means least total weight. |
|---|---|
| C.3. Evaluating Learning (Complete instructions for learners are | on the Learning Activity Sheet.) |
| Activity C.3. Assessing Answer Key: Part I: 1. A. 2. A. 3. A. 4. A. 5. A. 6. B. Part II item 1: Dijkstra from A finalizes A, then B, then C, then D. The Part II item 2: the C-row of the all-pairs matrix is C to A = 5, C to B = Part III: 1. False, the length is the sum of the edge weights, not the the all-pairs result. 4. False, the shortest path has the least total weight, single-source Dijkstra computes. Rubric for each constructed-response item (0 to 4): ● 4: correct order or row with correct distances and shown ● 3: correct method with one wrong distance. ● 2: correct setup but the computation is incomplete. ● 1: an attempt that does not follow the stated method. ● 0: no response or unrelated work. Scoring: Part I, six items at 1 point each, 6 points. Part II, two items at Total 24 points. | Learning Outcomes shortest distances are A = 0, B = 2, C = 5, and D = 6. 3, C to C = 0, and C to D = 1. count. 2. False, Dijkstra requires non-negative weights. 3. True, that is which need not use the fewest edges. 5. True, that is exactly what work. 4 points each, 8 points. Part III, five items at 2 points each, 10 points. |

-----

***C.4. Additional Activities (Complete instructions for learners are on the Learning Activity Sheet.)***

###### Activity C.4. Extending and Reinforcing Learning For Remediation

**Purpose: Rebuild the Dijkstra procedure on a small graph for learners who struggled in C.3. Strategy 1: Trace Together**

Walk the tentative distances one finalize at a time, naming each update.

###### Procedure for the teacher:

1. Set the tentative distances with the learner.
2. Finalize vertices one at a time, updating neighbors.
3. List the final shortest distances from A.

**Answer to the task: Dijkstra from A finalizes A at 0, B at 1, C at 3, then D at 6. The shortest distances are B = 1, C = 3, and D = 6. Figure**

17 shows the result.

![](img_p251_1.png)

**Figure 17. Remediation: the shortest distance from A to each vertex by Dijkstra.**

###### Facilitating Reflection:

PQ1. Answer: B is finalized second, at distance 1.

###### For Enhancement

**Purpose: Stretch confident learners to compute all-pairs distances on the same graph and connect the result to the single-source answer. Strategy 1. Build and Read**

Have learners build the matrix and update it through each vertex, then read the A-row.

-----

###### Procedure for the teacher:

1. Have learners write the initial matrix.
2. Have them update through A, B, C, and D in turn.
3. Have them read the A-row and compare it with the Dijkstra distances.

**Answer to the task: The final all-pairs matrix is shown in Figure 18. Its A-row reads 0, 1, 3, 6, which matches the Dijkstra distances from**

A in the remediation task.

![](img_p252_1.png)

|  | Figure 18. Enhancement: the all-pairs shortest distances by Floyd-Warshall on the same network. Facilitating Reflection: PQ. Answer: the A-row of the all-pairs matrix equals the single-source shortest distances from A. |
|---|---|
| V. ASSESSMENT | To evaluate learners' success in attaining the intended learning competencies, the assessment tools and strategies provided on the link in the table of contents can be utilized to measure understanding, skills, and application of concepts. |
| VI. REFLECTION | To assess and evaluate the effectiveness of the instruction, as well as to identify challenges and plan for improvements in this unit, teachers are encouraged to answer the reflective questions provided in the link indicated in the table of contents. |