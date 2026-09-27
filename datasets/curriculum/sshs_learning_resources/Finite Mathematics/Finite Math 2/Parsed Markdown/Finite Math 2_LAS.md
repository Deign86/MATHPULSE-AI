# Learning Activity Sheets for Finite Math 2

## ACADEMIC ELECTIVE

-----

### Learning Activity Sheet for Finite Mathematics

### This material is intended exclusively for the use of Senior High School teachers

participating in the implementation of the Strengthened Senior High School Curriculum. It aims to assist in delivering the curriculum content, standards, and lesson competencies.

Any unauthorized reproduction, distribution, modification, or utilization of this material beyond the designated scope is strictly prohibited and may result in appropriate legal actions

and disciplinary measures.

---

##### Development Team

**Writers:** Patrick F. Pelimer, Allen James R. Barlis, Melvin P. Bahain,

Precious Isabel V. Saludes, Michelle C. Cruz, Jean L. Bataller, Nessa S. Loveres, Daniel C. Geraldez, Niezy Mae H. Postrero, Kent A. Chan

**Validators:** Earl John D. Ares, Nerwyn Z. Samoro, James Rey G.

Saludares, Emmaylou J. Yacapin, Raffy U. Fanuncio, Ruel D. Licanto, Gemma S. Singson

##### Consultant: Haidee P. Rosete

University of the Philippines - National Institute for Science and Mathematics Education

##### Learning Area Specialist: Wilson R. Santiago

Senior Education Program Specialist Bureau of Learning Delivery - Teaching and Learning Division

Bureau of Learning Delivery Bureau of Curriculum Development Bureau of Learning Resources

---

Borrowed content included in this material is owned by their respective copyright holders. Every effort has been made to locate and obtain permission to use these materials from their respective copyright owners. The publisher and development team do not represent nor claim ownership over them.

Every care has been taken to ensure the accuracy of the information provided in this material. For inquiries or feedback, please write or call the Office of the Director of the Bureau of Learning Resources via telephone numbers (02) 8634-1072 and 8631-6922 or by email at blr.od@deped.gov.ph

-----

### TABLE OF CONTENTS

**Lesson No. Title Unit 1. Counting Techniques**

1.1 The Addition and Multiplication Principles of Counting 1.2 Permutations of Distinct Objects 1.3 Combinations of Distinct Objects 1.4 Permutations with Repetition and Circular Arrangements 1.5 Combinatorial Counting Techniques and Their Applications

**Pages 1**

1 - 5 5 - 8 8 - 13 13 - 17 17 - 22

**Unit 2. Probability**

2.1 2.2 2.3 2.4 2.5

Probability of an Event Addition of Probabilities Independent Events Conditional Probability Bayes' Rule

**23**

23 - 25 25 - 27 27 - 30 30 - 33 33 - 35

3.1 3.2 3.3

3.4 3.5

3.6 3.7

**Unit 3. Number Theory**

Divisibility and Its Properties Primes, Fundamental Theorem of Arithmetic, and Prime Factorization Computing the Greatest Common Divisor (GCD) and Least Common Multiple (LCM) of Two Positive Integers Using Prime Factorization and the Euclidean Algorithm Solving Linear Diophantine Equations Using the Euclidean Algorithm Congruence Modulo m: Properties and Modular Arithmetic Operations Solving Linear Congruences Applications of Modular Arithmetic in Real-World Verification Systems

**35**

35 - 38 38 - 40 40 - 43

43 - 46 46 - 50

50 - 56 56 - 60

**Unit 4. Networks and Graph**

4.1 Fundamental Concepts of Graph Theory 4.2 Eulerian Paths and Circuits 4.3 Hamiltonian Paths and Circuits 4.4 Spanning Trees with BFS and DFS 4.5 Shortest Paths with Dijkstra and Floyd-Warshall

**60**

60 - 65 65 - 70 70 - 77 77 - 81 81 - 86

-----

# LEARNING ACTIVITY SHEET

##### Unit No. & Title Unit 1. Counting Techniques Name: Grade & Section:

##### Lesson No. & Lesson 1.1. Addition and Multiplication Principles of Counting Title:

**Objectives:** At the end of this lesson you are expected to:

1. define and differentiate the Addition Principle of Counting and Multiplication Principle of Counting in simple counting situations;
2. determine whether to use the Addition Principle or the Multiplication Principle in each counting problem; and
3. use the addition and multiplication principles to count elements of a set.

| Key Ideas and | Addition Principle |
|---|---|
| Examples: | The Addition Principle is used when you are choosing exactly one item from several different groups that have nothing in common. These are called mutually exclusive |

events, meaning if you pick one, you cannot pick the other.

Definition: If one task can be done in ways and a second task can be done in ways, and the two tasks are mutually exclusive (cannot be done at the same time), then there are + ways to do either the first task or the second task.

Example: The Library Choice Suppose you want to borrow a book from the library. There are 5 Mystery books and 8 Science Fiction books on the shelf. If you are only allowed to borrow one book, how many choices do you have?

Since you can only pick one, you are picking a Mystery book or a Science Fiction book:

5 + 8 = choices. Processing Question: If you choose a Mystery book, can you also choose a Science Fiction book in this scenario? Why does this situation illustrate the addition principle?

Multiplication Principle The Multiplication Principle is used when a situation involves a sequence of steps or multiple choices that happen together.

| Definition: If there are | ways to do one thing and | ways to do another thing |
|---|---|---|
| after the first is done, then there are | × | ways to do both things together. |

Example: Password Creator You need to create a simple 2-character security code. The first character must be from letters A, B, and C. The second character must be from numbers 0 to 4. How many unique codes can you create?

To complete the code, you must pick a letter AND a number: 3 × 5 = combinations

Visualization of Possible Codes: (A0, A1, A2, A3, A4, B0, B1, B2, B3, B4, C0, C1, C2, C3, C4)

Processing Question: Why would adding (3 + 5 ) give an incorrect answer? Look at the visualization of possible codes, how does multiplication account for the "pairing" of items?

Table Guide for Addition and Multiplication Principle

-----

##### Principle Logic

| Addition | You are choosing one from the group. |
|---|---|
| Multiplication | You are building a combination or a sequence. |

Combination of the Addition and Multiplication Principles in Counting

Sometimes, real-life problems are not as simple as choosing "either this or that." Often, you will encounter scenarios where you must use both the Addition and Multiplication Principles to find the final answer. This usually happens when there are several ways to complete a task, and each option involves multiple steps.

Example: Imagine a school contest where the winner gets to choose a prize package from one of two sponsors:

Sponsor A: Offers 3 types of tablets and 2 types of headphones. A winner gets one of each. Sponsor B: Offers 4 types of jerseys and 3 types of gym bags. A winner gets one of each.

If you win, you can choose either Sponsor A's package or Sponsor B's package. How many total prize combinations are possible?

Solution: First, compute the total number of possible combinations for each sponsor using the Multiplication Principle: Sponsor A: 3 × 2 = 6 combinations Sponsor B: 4 × 3 = 12 combinations To find how many total prize combinations are possible, we will now use the Addition Principle: 6 +12 = total possible combinations Processing Question: Why couldn't you just add all the items together (3 +2 + 4+ 3 )? Why is it necessary to multiply the items within each sponsor's group first? Example: You are planning a trip from City A to City C. There are two ways to travel from City A to City C:

Option 1 (Bus and Train Ride): There are three bus routes from City A to City B and two train routes from City B to City C.

Option 2 (Direct Flight): There are 4 different direct flights from City A to City C.

How many total ways can you travel from City A to City C?

Solution: To compute this, we need to know the total possible routes for both Options 1 and 2. Option 1: 3 × 2 = 6 possible routes Option 2: 4 possible routes

Now we will use the addition principle to solve the total number of ways that you can travel from City A to City C: 6 +4 = possible ways **Other Resources:** LMKMaths (2015). 01 The Addition and Multiplication Principles. Youtube.

[https://youtu.be/yTsbGglDo04](https://youtu.be/yTsbGglDo04)

The Organic Chemistry Tutor (2023). The Fundamental Counting Principle. Youtube. [https://youtu.be/3lmEqp8VhAU](https://youtu.be/3lmEqp8VhAU)

-----

WOW MATH (2021). Fundamental Principle of Counting || Grade 10 Mathematics

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | Use the addition and multiplication principles to solve each problem. Show your solution. |

##### Guided Practice

1. A Grade 11 student is required to enroll in one elective subject. The school offers 6 Arts and Design electives and 4 Sports electives. If the student may enroll in only one elective, how many possible choices are available?
2. A temporary ID code consists of one uppercase letter (A, B, C, or D) followed by one digit (0-9). How many unique ID codes can be generated? Independent Practice
3. A teacher travels to school using either a tricycle or a jeepney. There are 3 jeepney routes and 5 tricycle routes available. How many transportation options are does the teacher have?
4. A snack meal consists of one sandwich (Ham, Egg, Cheese, Chicken, Tuna) and one drink (Juice, Water, Milk). How many snack combinations are possible?
5. The committee will select one complete set from the following proposals; Proposal A (3 Polo colors and 2 slacks, one of each) and Proposal B (4 T-shirt colors and 3 Shorts, one of each). How many different outfit combinations are possible?
6. The Game of the Year features one pair from Bracket 1 (5 Manila teams and 4 Quezon City teams, paired) or one pair from Bracket 2 (6 Cavite teams and 2 Laguna teams, paired). How many possible match-ups are there in all?

##### Exit Ticket

Solve each problem. Then identify whether you used the Addition Principles or the Multiplication Principle, and explain your answer on one sentence.

|  | 1. A student joins one club. The school has 4 sports clubs and 3 academic clubs. How many club choices does the student have? 2. A passcode consists of one vowel (A, E, I, O, U) followed by one single-digit prime (2, 3, 5, 7). How many different passcodes can be formed? |
|---|---|
| IV. Reflection: | To summarize your learning, answer each of the following questions. 1. How do you determine whether a problem should be solved using the Addition Principle or the Multiplication Principle? Explain using one example from today's activities. 2. What is the difference between making a choice from separate options and combining two or more selections? How does this difference affect the operation you use? 3. Why are the Addition and Multiplication Principles useful in solving real-life counting problems such as choosing electives, creating passcodes, or selecting outfit combinations? |

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write "True" or "False", and justify your answer using a computation or clear explanation. |

You may use a calculator. Part I. Multiple Choice Choose the letter of the best answer.

1. A student buys exactly one snack: 4 kinds of chips or 3 kinds of biscuits. How many choices are there? A. 7 B. 12 C. 4 D. 3

-----

2. A set meal pairs one of 3 main dishes with one of 4 drinks. How many different meals are possible? A. 7 B. 12 C. 24 D. 3
3. Which situation uses the Addition Principle?
A. travel to a town by bus or by train
B. choose a shirt and a tie
C. set a 4-digit PIN
D. arrange 3 books on a shelf
4. A temporary password consists of one letter (26 possible letters) followed by one digit (10 possible digits). How many different passwords can be formed? A. 36 B. 260 C. 26 D. 16
5. To reach school, you take one of 2 jeepney routes or one of 3 tricycle routes, then enter through any of 4 gates. How many different ways can you reach a classroom? A. 9 B. 14 C. 20 D. 24

Part II. Constructed Response Show your complete solution.

1. A canteen offers 3 rice meals and 5 noodle meals. (a) If you choose exactly one meal, how many choices are there? (b) If you choose one rice meal and one noodle meal to share, how many pairs are possible?
2. A school ID code is one letter from {A, B, C, D} followed by two digits from 0 to 9, with repetition of digits allowed. (a) How many codes are possible? (b) How many of these codes end in 0?

|  | Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning. 1. If two choices are made one after the other in stages, the total number of outcomes is found by multiplying. 2. The addition principle applies when the two options can both be chosen at the same time. 3. Choosing exactly one item from 5 shirts or 4 pairs of pants gives 5 × 4 = 20 choices. 4. If one task has m outcomes and a following task has n outcomes, the two tasks together have m × n outcomes. 5. For disjoint sets A and B, the size of A union B equals the size of A plus the size of B. |
|---|---|
| IV. Reflection: | Reflect on the lesson and answer each question clearly and concisely. 1. When do we use addition, and when do we use multipliplication in counting problems? 2. Which assessment item best helped you understand the difference between the two principles? Why? 3. How can you apply these counting principles in your daily life? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | For Remediation: Use the decision map for each item. First, decide whether you are choosing only one |

item from each group. Then determine whether to add or to multiply.

1. You can buy one piece of fruit. There are 6 apples and 4 mangoes. Are you choosing just one fruit or two fruits. If you are choosing only one fruit, use addition If you are choosing one fruit from each group, use multiplication. Fill in: \_\_\_\_ (apples) + or × \_\_\_\_ (mangoes) = \_\_\_\_ total choices.
2. You are choosing a Sunday outfit from 2 shirts (Blue and White) and 3 pair of pants (Black, Khaki, and Gray). Draw a line from each shirt to every pair of pants, then count the lines. Fill in: \_\_\_\_ (shirts) + or × \_\_\_\_ (pants) = \_\_\_\_ total outfits.

-----

3. Circle the keyword and identify the correct operation. (a) I want a soda or a juice. Operation: \_\_\_\_. (b) I want a burger and fries. Operation: \_\_\_\_.

*For Enhancement:* Solve each situation. Show your complete solution and justify your answer.

1. A basketball league has Division A (4 teams) and Division B (5 teams). Task 1. If you watch one game from Division A and one game from Division B, how many pairs of games can you watch? Task 2. If you watch only one game from the entire league, how many options do you have?
2. A desktop is built by choosing 1 processor (from 3 options), 1 RAM size (from 2 options), and 1 storage size (from 3 options). If you choose not customize it, you may select one of 5 ready-to-go models. How many ways can you purchase a desktop?
3. A plate number consists of one letter (A or B) and one digit (1, 2, or 3). List all possible plate numbers. Does the number of plate numbers you listed illustrate the Addition Principle or the Multiplication Principle? Why? **IV. Reflection:** Using what you have learned from the lesson, answer each question. *For Enhancement* Which word in each item tells you to use addition, and which word tells you to use multiplication?

*For Remediation* In the desktop problem, why did you multiply the custom parts before adding the ready-to-use models?

|  |  |
|---|---|
| Lesson No. & Title | Lesson 1.2. Permutation in Counting Objects |
| Objectives: | At the end of this lesson you are expected to: 1. investigate arrangements of small sets of distinct objects through enumeration to recognize that order matters in some counting problems; 2. define a permutation as an ordered arrangement of distinct objects; 3. derive the formula (, ) = ! by extending the multiplication principle (-)! inductively from small cases; 4. calculate P(n, k) using the formula and factorial notation; 5. verify computed values of P(n, k) by enumeration for small n and k; 6. identify problems in which permutations apply by determining whether the order of selection matters; and 7. solve basic problems involving permutations of distinct objects in real-world contexts. |
| Key Ideas and Examples: | Recognizing Order and Defining Permutation A Permutation is an ordered arrangement of a set of distinct objects. The keyword is "ordered." If changing the order of the objects creates a different outcome (such as a password or race results), then it is a permutation. Example 1: Selecting a President and a Vice President from 4 students. (Order matters; therefore, this is a permutation) Example 2: Forming a two-digit number from the digits 7, 8, and 9 without repetition. (Order matters; therefore, this is a permutation) Formula for Permutation To find the number of permutations of distinct objects taken at a time, here is the formula for permutation: ! (, ) = ( - )! Example 1: Calculate (6,2) Solution: |

-----

Example 2: Calculate (7,3) Solution:

Example 3: Verifying through enumeration. Suppose you will choose 2 letters from letters A,B,C. Verify if you will get the same answer whether you use enumeration or the formula for permutation. Enumeration: AB, AC, BA, BC, CA, CB = 6 total ways Permutation Formula:

= 3 and = 2

(3,2) = 3! = 3! = 6 total ways

(3-2)! 1!

Application of Permutation in the Real - World

From 10 students, how many ways can we elect a President, a Vice-President, and a Secretary?

Reasoning: Order matters because the positions are distinct. Being President is different from being Vice President or Secretary.

Solution: Total number () = 10 students Choices () = 3 (One president, one vice president, and one secretary)

|  | (, ) = → (10,3) = → (10,3) = (10,3) = 10 × 9 × 8 = ways How many 4-digit PINs can be created using digits 0-9 if no digit is repeated? Reasoning: Order or Arrangement of numbers matters because in a PIN, the sequence "1234" is different from "4321." Solution: Total number () = 10 (numbers 0 to 9) Choices () = 4 (4 - digit pin) (, ) = → (10,4) = → (10,4) = (10,4) = 10 × 9 × 8 × 7 = , ways |
|---|---|
| Other Resources: | The Organic Chemistry Tutor (2017). Permutations and Combinations Tutorial. Youtube. https://youtu.be/XJnIdRXUi7A |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | Pen and Paper Calculator |

6! 6! 6 × 5 × 4! (6,2) = = = = 30

(6 -2)! 4! 4!

7! 7! 7 × 6 × 5 × 4! (7,3) = = = = 210

(7 - 3)! 4! 4!

| ! | 10! | 10! |
|---|---|---|
| ( - )! | (10 - 3)! | 7! |

10 × 9 × 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1 (10,3) =

7 × 6 × 5 × 4 × 3 × 2 × 1

| ! | 10! | 10! |
|---|---|---|
| ( - )! | (10 - 4)! | 6! |

10 × 9 × 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1 (10,4) =

6 × 5 × 4 × 3 × 2 × 1

-----

**III. Instructions:** Part I. Permutation or Not?

For each scenario, write P if it is a permutation or NP if it is not. If it is a permutation, compute the number of possible arrangements. Show the factorial expansion and simplify your solution.

a. Choosing 3 of 10 students to form a Clean-up Committee.
b. Assigning 3 of 10 students to serve as Class President, Secretary, and Treasurer.
c. Creating a 4-letter password from A, B, C, D, and E with no repeated letters.
d. Selecting 4 books from a shelf of 12 to bring on vacation. Part II. List and Verify From the letters W, X, Y, and Z, list all possible two-letter codes without repetition. Count the codes, then verify your answer using the permutation formula. **IV. Reflection:** To summarize your learning, answer each of the following questions.
1. Why is the Clean-up Committee in (a) not a permutation, while the Class Officers in (b) are?
2. When listing the two-letter codes, how did you make sure that you did not miss any codes or count any code twice?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify your answer with a computation or clear reasoning. You may |

use a calculator. Part I. Multiple Choice Choose the letter of the best answer.

1. Which situation is a permutation, in which order matters?
A. choosing 3 toppings from 8
B. selecting a team of 4 from 10
C. awarding gold, silver, and bronze to 3 of 8 runners
D. picking 2 fruits to blend
2. The permutation formula P(n, k) is equal to:
A. n! / (n - k)!
B. n! / (k! (n - k)!)
C. n! × k!
D. (n - k)! / n!
3. P(6, 2) is equal to: A. 12 B. 30 C. 15 D. 36
4. P(5, 5) is equal to: A. 1 B. 25 C. 120 D. 5
5. In how many ways can 4 distinct books be arranged in a row? A. 24 B. 16 C. 12 D. 4 Part II. Constructed Response Show your complete solution.
1. (a) Compute P(8, 3), showing the factorial expansion and the cancellation. (b) List all 2-letter arrangements of the letters in CAT, then verify the count using P(3, 2).
2. A club of 10 members elects a President, a Vice President, and a Secretary, and no member holds two posts. (a) In how many ways can the three posts be filled? (b) Explain why this is a permutation.

Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning.

1. A permutation is an ordered arrangement of distinct objects.
2. The permutation formula is P(n, k) = n! / (k! (n - k)!).
3. P(n, n) = n! for any positive integer n.
4. P(5, 2) and P(2, 5) give the same value.
5. P(n, 1) = n for any positive integer n.

-----

**IV. Reflection:** Reflect on the lesson and answer each question clearly and concisely.

1. How would you explain the concept of permutations to a classmate using your own words?
2. What is the relationship between factorials and permutations?
3. How can permutations be used to solve problems in everyday life and future careers?

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | For Remediation: Scaffolded Arrangements: Balls and Chairs |

1. You have a Red (R) ball and a Blue (B) ball. List all the possible ways to arrange the two in a row: \_\_\_\_, \_\_\_\_. (Total: 2)
2. Now add a Green (G) ball. List all the possible ways to arrange 2 of the 3 balls: \_\_\_\_ (Total: \_\_\_).
3. You have 5 students and 2 chairs, (Chair 1 and Chair 2). How many choices are there for Chair 1? After one student is seated, how many choices remain for Chair 2? Multiply: 5 × 4 = \_\_\_.
4. Write P(5, 2) = (5 × 4 × 3 × 2 × 1) / (3 × 2 × 1), cross out the common factors, and state the remaining factors.

|  | For Enhancement: Perform each challenge. Challenge 1. Use the formula to show why P(5, 5) equals 5!. What does this tell you about (n - k)! when are all the objects in a set arranged? Challenge 2. Without computing the large values, explain which is larger and why: P(10, 4) or P(10, 6). Hint: Consider the slots and the factors being multiplied. |
|---|---|
| IV. Reflection: | Using what you have learned in this lesson, answer each of the following questions. For Remediation: 1. What happened to the number of possible arrangements when an additional object was added? Why did the number of possible arrangements increase? 2. Why do we multiply the number of choices at each stage to find the total number of arrangements? 3. How does the expression (5,2) = 5 × 4 represent the process of filling Chair 1 then Chair 2? For Enhancement: 1. Based on Challenge 1, what relationship did you discover between (, ) and ! ? Explain why this relationship is always true. 2. When comparing (10,4) and (10,6) , how does the number of positions being filled affect the number of possible arrangements? 3. How can understanding the structure of the permutation formula help you compare or analyze permutations without performing lengthy computations? |

##### Lesson No. & Title: Lesson 1.3. Combination in Counting Objects

**Objectives:** At the end of this lesson you are expected to:

1. investigate selections from small sets through enumeration to recognize counting problems where order does not matter;
2. distinguish combinations from permutations using contextual cues in problem statements;
3. define a combination as an unordered selection of distinct objects;
4. derive the relationship C(n, k) = P(n, k) / k! by examining how each combination corresponds to k! orderings;
5. calculate C(n, k) using the formula and factorial notation;
6. investigate properties of combinations through small cases: C(n, k) = C(n, n - k), C(n, 0) = 1, C(n, n) = 1, and Pascal's rule C(n, k) = C(n - 1, k - 1) + C(n - 1, k);

-----

|  | 7. apply the properties of combinations to compute and verify counts of subsets; and 8. solve basic problems involving combinations in real-world contexts. |
|---|---|
| Key Ideas and Examples | Combination: When Order or Arrangement Does Not Matter A Combination is a selection of objects in which the order or arrangement does not matter. We only care about which objects are in the collection. Since order does not matter, we divide the number of permutations by ! to remove the duplicate arrangement, resulting in the following formula: (, ) ! (, ) = = ! ( - )! × ! where is the total number of objects and is the number of objects being selected. Example 1: A teacher needs to choose 4 students from a class of 10 to form a research committee. Reasoning: Order does not matter; if Student A and Student B are both selected for the committee, it does not matter who is chosen first. Solution: Total number ( ) = 10 (10 total students) Choices ( ) = 4 (4 students are chosen among 10 students) ! 10! (, ) = → (10,4) = ( - )! × ! (10 - 4)! × 4! 10! (10,4) = 6! × 4! 10 × 9 × 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1 (10,4) = (6 × 5 × 4 × 3 × 2 × 1) × (4 × 3 × 2 × 1) (10,4) = 10×9×8×7 = ways 4×3×2×1 Example 2: You want to buy 3 types of fruit from a store that sells 7 types of fruits. How many different fruit salads can you make? Reasoning: A fruit salad made with Apple, Banana, and Grape is the same regardless of the order in which the fruits are added to the bowl. Therefore, order does not matter. Solution: Total number () = 7 (7 types of fruits) Choices () = 3 (you will choose 3 fruits among 7 fruits) ! 7! (, ) = → (7,3) = ( - )! × ! (7 - 3)! × 3! 7! (7,3) = 4! × 3! 7 × 6 × 5 × 4 × 3 × 2 × 1 (7,3) = (4 × 3 × 2 × 1) × (3 × 2 × 1) (7,3) = 7×6×5 = 35 ways 3×2×1 Properties of Combination Property 1: (, 1) = |

-----

Example: (5,1) = 5 Solution:

5! 5! 5 × 4 × 3 × 2 × 1

(5,1) = = = = 5

(5 - 1)! × 1! 4! 4 × 3 × 2 × 1

C(3,1)=3 Solution:

3! 3! 3 × 2 × 1

(3,1) = = = = 3

(3 - 1)! × 1! 2! 2 × 1 You are at a toy store, and your parent tells you that you may choose exactly one toy from 10 different action figures on the shelf. How many choices do you have? Solution: There are 10 possible choices. Since you are choosing only one item, each item in the set represents one unique choice. Property 2: (, 0) = (, ) = 1 Example: (5,0) = 1 Solution:

5! 5! 5!

(5,0) = = = = 1

(5 -0)! × 0! 5! × 1 5!

(3,3) = 1 Solution:

3! 3! 3!

(3,0) = = = = 1

(3 - 3)! × 3! 0! × 3! 3!

A coach is forming a soccer team from a group of 15 students. The coach is considering selecting either all 15 students or no students at all. In how many ways can the coach choose all the students? In how many ways can the coach choose no students? Solution:

(15,15) = (15,0) = 1 In combination, choosing everyone and no one only happens once. Property 3: (, ) = (, -) Example:

(5,2) = (5,5- 2) → (5,3)

Solution: (5,2) = (5,3)

5! 5!

=

(5 - 2)! × 2! (5 - 3)! × 3! 5! 5!

=

3! × 2! 2! × 3!

Since multiplication is commutative, the two expressions are equal. (7,2) = (7,5) Solution: (7,2) = (7,5)

7! 7!

=

(7 - 2)! × 2! (7 - 5)! × 5!

-----

7! 7!

=

5! × 2! 2! × 5!

Since multiplication is commutative, therefore it is equal.

You have 5 best friends, but you only have 2 extra tickets to a concert. You need to choose 2 friends to take with you. How is this related to the friends you leave behind?

Solution: Choosing 2 friends to go with you is equivalent to choosing 3 friends to stay home. Every time you choose a group of 2 to go, you automatically determine the group of 3 friends who stay behind. Therefore, the number of ways to choose 2 friends is the same as the number of ways to choose 3 friends. Mathematically, (5,2) = (5,3) = 10. Property 4: (, ) = ( - 1, ) + ( - 1, - 1) Example:

(7,3) = (6,3)+ (6,2) Solution:

(7,3) = (6,3)+ (6,2)

7! 6! 6!

|  | = |  |  | + |
|---|---|---|---|---|
| (7 -3)! × 3! | (6 - | 3)! × | 3! | (6 -2)! × 2! |
| 7! 6! 6! |  |  |  |  |
|  | = |  | + |  |
| 4! × | 3! | 3! × 3! | 4! | × 2! |
| 7 × 6 × | 5 | 6 × 5 × | 4 | 6 × 5 |
|  |  | = |  | + |
| 3 × 2 × | 1 | 3 × 2 × | 1 | 2 × 1 |
|  | 210 | 120 | 30 |  |
|  |  | = | + |  |
|  | 6 | 6 | 2 |  |
|  | 35 = 20 + 15 |  |  |  |

35 = 35

You are forming a committee of 3 students from a class of 10. One of the students is your best friend. How many committees can be formed if your best friend is either included or not included?

Solution: The total number of ways to form the committee is the sum of two cases. First, consider the case in which Sam is not selected. In this case, choose 3 students from the remaining 9. Second, consider the case in which Sam is selected. Since Sam already occupies one spot on the committee, you only need to choose two more students from the remaining 9. Adding the results of these two cases gives the toal number of possible committees.

(10,3) = (9,3)+ (9,2) = 84 + 36 = 120 ways **Other Resources:** The Organic Chemistry Tutor (2017). Permutations and Combinations Tutorial.

[Youtube. https://youtu.be/XJnIdRXUi7A](https://youtu.be/XJnIdRXUi7A)

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | Part I. Write P or C, and give a one-sentence reason. 1. Creating a 5-digit PIN using digits 0 to 9 without repetition. |

2. Selecting 4 soda flavors from 12 available to share with friends.

-----

3. Electing a President, a Secretary, and a Public Information Officer from 15 candidates.
4. Pairing 2 of 20 people for a handshake.
5. Arranging 6 textbooks in a row on a shelf. Part II. Solve
1. From 6 snacks, how many different pairs of 2 can you choose?
2. From 8 applicants, how many teams of 3 designers are possible?
3. From a deck of 12 unique cards, how many hands of 5 cards can be dealt? Part III. Use the Properties
1. From 25 buffet dishes, in how many ways can you choose 1 dish?
2. From 12 students, in how many ways can a teacher choose none? In how many ways can the teacher choose all of them?
3. If C(10, 2) = 45, what is C(10, 8)? Name the property you used.
4. Which two combinations add up to C(10, 7)? **IV. Reflection:** To summarize your learning, answer each of the following questions.
1. Why does dividing by k! make the answer smaller, and what does that division represent?
2. Why must C(10, 2) and C(10, 8) be equal? How is selecting 2 people related to not selecting 8 people?
3. What key idea helps you determine immediately whether a problem involves a permutation or a combination? Give one example of a word change that changes a combination into anpermutation.

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | Pen and Paper Calculator |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify with a computation or clear reasoning. You may use a |

calculator. Part I. Multiple Choice Choose the letter of the best answer.

1. Which situation represents a combination, where order does not matter?
A. arranging 5 books on a shelf
B. selecting 3 students from 12 for a committee
C. awarding 1st, 2nd, and 3rd place
D. forming a 4-digit PIN
2. The combination formula C(n, k) is equal to:
A. P(n, k) / k!
B. n! / (n - k)!
C. n! × k!
D. k! / (n - k)!
3. C(7, 2) is equal to: A. 42 B. 14 C. 21 D. 49
4. C(10, 10) is equal to: A. 0 B. 1 C. 10 D. 100
5. C(8, 3) is equal to: A. 336 B. 24 C. 112 D. 56 Part II. Constructed Response Show your complete solution.
1. A library has 12 mystery novels, and you may borrow 4 of them. (a) How many different sets of 4 novels can you borrow? Show the cancellation. (b) Explain why this is a combination, not a permutation.
2. Use the properties of combinations. (a) Find C(100, 1). (b) Given that C(10, 8) = 45, find C(10, 2) and name the property used. Part III. True or False with Reasoning

-----

|  | Write True or False, then justify with a computation or clear explanation. 1. A combination is an unordered selection of distinct objects. 2. C(n, k) = C(n, n - k) for all valid n and k. 3. The number of ways to choose 3 students from 8 for a committee is P(8, 3) = 336. 4. C(n, 0) = 1 for every whole number n. 5. Because order does not matter, C(6, 2) is greater than P(6, 2). |
|---|---|
| IV. Reflection: | Reflect on the lesson and answer each question clearly and concisely. 1. Why is selecting committee members considered a combination rather than a permutation? 2. What did you learn about the relationship between combinations and permutations from today's activities? 3. How can combinations be applied in real-life situations where the order of selection is not important? |
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | Pen and Paper Calculator |
| III. Instructions: | For Remediation: Step by Step: C(5, 2) 1. Circle the correct word. In a permutation, the order (does / does not) matter. In a combination, the order (does / does not) matter. 2. C(5, 2) means choosing ______ items from ______ items. So n = ______ and k = ______. 3. Fill in the formula: C(5, 2) = 5! / [(5 - ______)! × ______!]. 4. Expand and cancel: (5 × 4 × 3 × 2 × 1) / [(3 × 2 × 1) × (2 × 1)] = ______. For Enhancement: Perform each exercise. Challenge 1. Explain why a club of 20 members has the same number of ways to form a committee of 3 as a committee of 17. Prove it by showing the simplified factorial fractions for C(20, 3) and C(20, 17). Challenge 2. A committee of 4 members is to be formed from 5 men and 3 women. How many committees can be formed without any restrictions? How many committees can be formed if the committed must include exactly 3 women? |
| IV. Reflection: | Using what you have learned from the lesson, answers to each question for remediation. For Remediation 1. How does the fact that order does not matter in combinations affect the way we count selections? 2. What do the values of and represent in the combination formula, and how do they help solve counting problems? 3. Why is it necessary to divide by ! when calculating combinations? What overcounting does this correct? For Enhancement 1. What does the relationship (, ) = (, - ) tell us about selecting a group and not selecting the remaining members? 2. How do restrictions, such as requiring a certain number of women on a committee, affect the way combinations are calculated? 3. What strategies can you use to solve more complex combination problems without listing all possible selections? |
| Lesson No. & Title: | Lesson 1.4. Permutations with Repeated Elements and Circular Arrangements |
| Objectives: | At the end of this lesson, you are expected to: 1. examine arrangements of words with repeated letters (e.g., MISSISSIPPI) to recognize overcounting in standard permutation counts; 2. derive the formula for permutations of non-distinct objects: n! / (n₁! · n₂! · … · nₖ!), where the nᵢ count occurrences of each repeated element; |

-----

|  | 3. calculate the number of permutations of a set with non-distinct elements; 4. investigate seating arrangements around a circular table for small groups to recognize that rotations produce equivalent arrangements; 5. derive the formula for circular permutations of n distinct objects: (n - 1)!; 6. calculate the number of circular permutations of distinct objects; and 7. differentiate between linear and circular arrangements in problem contexts and apply the appropriate formula. |
|---|---|
| Key Ideas: | A permutation with repeated elements (also called a permutation of non-distinct objects) is an arrangement of objects in which some of the objects are identical. |

Derivation of Formula for Permutations with Repeated Elements

1. Start with the general case For distinct objects, the number of linear permutations is: = ! This counts all possible arrangements if every object is unique.
2. Adjust for repeated objects. Suppose some objects are identical. For example, in the word MISSISSIPPI, the repeating letters are indistinguishable. Swapping identical letter does not create a new arrangement, but the raw ! count treats them as different. Therefore, we divide the factorial of the number of identical objects in each group to correct for overcounting. Since exchanging identical objects does not produce a new arrangement, the total number of distinct permutations is given by: ! = ! ⋅ ! ⋅ … ⋅ !

1 2

where:

= total number of objects , , … , = frequencies of each group of identical objects

1 2

3. Conceptual justification Each group of identical objects can be permuted among themselves in ! ways, but these permutations are indistinguishable.

Dividing by ! removes the overcount.

The formula generalizes to any number of repeated groups.

A circular permutation is an arrangement of distinct objects around a circle, where rotations of the same arrangement are considered identical. Unlike in linear permutations, the starting position in a circular arrangement does not matter because the rotating the arrangement does not change relative positions of the objects. Derivation of Formula for Circular Permutations

1. Start with linear permutations For distinct objects in a line: = !
2. Adjust for circularity In a circle, rotations of the same arrangement are considered identical. For example, circular arrangement A-B-C-D is the same as B-C-D-A. Thus, every distinct circular arrangement corresponds to equivalent linear arrangements (one for each possible starting point). So, we divide by : ! = = ( - 1)! Therefore, the number of distinct circular permutations of objects is: = ( -1)! where: = total number of distinct objects
3. Conceptual justification

| Fix one object's position | to eliminate | rotational symmetry. |
|---|---|---|
| Arrange the remaining | - 1 | objects freely. |
| This yields ( - 1)! | distinct circular | permutations. |

Special Case of Circular Permutations For circular arrangements in which reflections are also considered identical (like necklaces or keychains), the formula changes. Special case (rotations and reflections identical):

-----

|  | ( -1)! = 2 This formula applies to necklaces, bracelets, and similar objects because flipping the arrangement produces the same design. |
|---|---|
| Examples and Illustrations: | Permutations with Repeated Elements Example 1: How many distinct permutations can be formed from the letters of the word MISSISSIPPI? Total letters = 11. Frequencies: M (1), I (4), S (4), P (2). 11! 39916800 Solution: = = = 34650 1!⋅4!⋅4!⋅2! 1152 Answer: There are 34650 distinct permutations |

Example 2: How many distinct permutations can be formed from the letters of the word BALLOON? Total letters: = 7 Repeated letters: L (2), O (2) Solution: 7! 5040 = = = 1260

2! ⋅ 2! 4 Answer: There are 1260 distinct permutations.

Example 3: A necklace is made 8 beads: 3 red, 3 blue, and 2 green. Assuming the beads are arranged in a line, how many distinct arrangements can be formed? Total beads: = 8 Repeated beads: Red (3), Blue (3), Green (2) Formula:

8! 40320 = = = 560

3! ⋅ 3! ⋅ 2! 72 Answer: There are 560 distinct arrangements.

Circular Permutations Example 1: How many ways can 8 people sit around a round table? Solution: = (8- 1)! = 7! = 5040. Answer: 5040 ways

Example 2: Seven different types of flowers are arranged in a circular wreath. How many can distinct arrangements are possible? Solution: = ( - 1)! = (7 - 1)! = 6! = 720 Answer: There are720 distinct arrangements.

Example 3: Eight distinct beads are strung on a circular necklace. How many distinct arrangements are possible if rotations are considered identical? Solution: = ( - 1)! = (8 - 1)! = 7! = 5040 Answer: There are 5040 distinct arrangements.

|  | Special Case of Circular Permutations Example 1 (Necklace): How many distinct arrangements can be made with 6 different beads on a necklace if reflections are considered identica ? (6-1)! 120 Solution: = = = 60 2 2 Answer: There are 60 distinct arrangements. Example 2 (Keychain): Five distinct keys are placed on a circular key ring. How many distinct arrangements are possible if reflections are considered identical? (5-1)! 24 Solution: = = = 12 2 2 Answer: There are 12 distinct arrangements. |
|---|---|
| Other Resources: | Permutations with Repeated Letters / Elements: https://www.youtube.com/watch?v=oO1ElSEyFsQ Permutations with Circular Arrangements: |

-----

| I. Activity No. 1 | Practicing Learned Skills |
|---|---|
| II. Materials Needed: | pen and paper |
| III. Instructions: | Each task below uses one of the arrangement rules from this lesson. Read each task carefully, identify the appropriate rule, then write the formula, show the complete solution, and state final answer. Part I. Guided Practice 1. Instructions: Work in groups of four to five. Solve the problem together and be ready to explain to the class why you chose the appropriate rule. 2. The word MUSICALLY will be printed on the stage banner. How many distinct letter arrangements are possible? 3. Nine VIP guests will be seated around a circular table. How many distinct seating arrangements are possible? Part II. Independent Practice Work independently. For each task, write the appropriate formula, the computation, the final answer, and one sentence stating why that rule applies. 1.The word CONCERT will appear in the program logo. How many distinct letter arrangements are possible? 2.Seven performers form a circular lineup for the opening number. How many distinct arrangements are possible? 3.The snack table sign spells BANANA. How many distinct letter arrangements are possible? 4.Six different charms are strung on a circular bracelet for the lead performer. How many distinct bracelets arrangements are possible if turning the bracelet over is considered the same arrangement? |
| IV. Reflection: | To summarize your learning, answer each of the following questions. 1. Which problems used the same counting principles even though the situations were different? How did you determine that they used the same principles? 2. Which task was the most challenging, and what step in your solution helped you identify or correct your mistakes? |
|  |  |

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper Scientific Calculator |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify with a computation or clear reasoning. You may use a |

calculator. Part I. Multiple Choice Choose the letter of the best answer.

1. Why does the plain count 5! overcount the arrangements of the letters of LEVEL?
A. the word is short
B. some letters are repeated
C. the letters are all vowels
D. it reads the same backward
2. The number of distinct arrangements of the letters of LEVEL is: A. 120 B. 60 C. 30 D. 20
3. In how many distinct ways can 5 distinct people be seated around a round table? A. 120 B. 24 C. 60 D. 25
4. Which situation requires a circular permutation?
A. lining up 5 students for attendance
B. placing 5 books on a shelf
C. seating 5 guests around a round table

-----

D. printing 5 letters on a banner

5. The number of distinct arrangements of the letters of the word BANANA is: A. 60 B. 720 C. 120 D. 360 Part II. Constructed Response Show your complete solution.
1. Find the number of distinct arrangements of the letters of the word ADDRESS. Show the complete solution and explain in one sentence why division is used in the formula.
2. (a) In how many ways can 6 distinct people be seated around a round table? (b) Explain why the answer is (6 - 1)! and not 6!. Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning.
1. If a word has repeated letters, the number of distinct arrangements is found by dividing n! by the factorials of the repetition counts.
2. The letters of the word LEVEL can be arranged in 5! = 120 distinct ways.
3. For n distinct objects arranged in a circle, the number of circular arrangements is (n - 1)!.
4. Seating people around a round table and arranging them in a row result in the same number of arrangements.
5. The number of distinct arrangements of the letters of the word BOOK is 12. **IV. Reflection:** Reflect on the lesson and answer each question clearly and concisely.
1. Why would using ! alone give an incorrect answer for words such as LEVEL, BANANA, or ADDRESS?
2. Why is one position considered fixed when counting circular arrangements?
3. How are repeated permutations and circular permutations useful in solving reallife problems involving arrangements and seating plans?

|  |  |
|---|---|
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | Pen and Paper Calculator |
| III. Instructions: | For Remediation: Small Steps with Small Numbers • Worked model (MAMA). Count as if all letters are different: 4! = 24. The letter M repeats twice and A repeats twice. Divide to remove the repeats: 4! / (2! times 2!) = 24 / 4 = 6. • Solve each task with the same three steps: count as if all are different, find the repeats, then divide. 1. Find the number of distinct arrangements of the letters of BALL. 2. Find the number of distinct arrangements of the letters of PEPPER. 3. Find the number of distinct arrangements of the letters of KAYAK. 4. Fill in the rule: 4 books on a shelf use the rule ____, and 4 people around a table use the rule ____. 5. Find the number of ways 6 people can sit around a round table. For Enhancement: Event Planner Challenge 1. Act as the event planner for Cultural Night. Solve each task, show your reasoning, and present your answers as a short note or infographic. 2. Find the number of distinct arrangements of the letters of the banner word SUCCESSFUL. 3. Twelve performers will stand around a circular stage. Two of them form a singing duo and must stand together. Find the number of distinct arrangements. |
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question For Remediation 1. In your three word tasks, how did you determine which factorials to divide by? 2. Why did the round-table task result in a smaller count arranging the same people in a row? |

*For Enhancement*

1. How does treating the singing duo as a single unit affect the number of circular arrangements, and why does this method require an additional factor?

-----

2. What real-life situations would require a third performer to stand beside a singing duo?

##### Lesson No. & Title Lesson 1.5. COMBINATORIAL COUNTING TECHNIQUES AND ITS APPLICATIONS

**Objectives:** At the end of this lesson, you are expected to:

1. examine distribution scenarios involving distinct objects placed into distinct groups; relate to the multiplication principle and combinations;
2. compute the number of ways of distributing distinct objects into distinct groups under varied conditions (with or without restrictions);
3. examine distribution scenarios involving non-distinct (identical) objects placed into distinct groups; introduce the stars-and-bars technique through small cases;
4. compute the number of ways of distributing non-distinct objects into distinct groups using stars and bars;
5. analyze counting problems to determine which combinatorial technique applies (addition, multiplication, permutation, combination, or distribution); and
6. solve multi-step counting problems that combine principles, permutations, combinations, and distributions in real-world scenarios. **Key Ideas:** A. Distributing Distinct Objects into Distinct Groups The distribution of distinct objects into distinct groups is the combinatorial process of determining the number of ways to assign a set of different (distinguishable) objects into different (labeled) groups, where each object is placed in exactly one group. Since both the objects and the groups are distinct, the assignment depends on which object is assigned to which group. The number of possible distributions is given by:

where = number of distinct objects, and = number of distinct groups. B. Distribution of Non-Distinct Objects into Groups is the combinatorial process of determining the number of ways to allocate a set of identical (indistinguishable) objects into distinct (labeled) groups or containers. Since the objects are identical, only the number of objects per group matters, not the order. When distributing identical objects, use the Stars and Bars formula:

( + - )

where = identical objects, = groups.

| C. Choosing the | Correct Technique |  |
|---|---|---|
| Situation | Key Feature | Technique multiplication |
| Objects are distinct | order/assignment matters | principle / |

permutations Objects are only counts

stars and bars identical matter Arrangements casework /

restrictions exist with conditions complement rule Selection only no arrangement combinations

| Examples and | A. Distributing Distinct Objects into Distinct Groups |
|---|---|
| Illustrations: | Example 1 (No restriction): Distribute 4 distinct books among 3 students. |

Solution: = 34 = 81 Answer: There are 81 possible distributions

Example 2 (No restriction): There are 6 distinct tasks and 4 workers. Each task can be assigned to any worker. Solution: = 46 = 4096

-----

|  | Answer: There are 4096 possible distributions. Example 3 (No restriction): There are 5 students: Anna, Ben, Carla, David, and Ella. They will be assigned to 3 different clubs: Math Club, Science Club, and Arts Club. How many possible assignments are there if each student joins any club? Solution: = 35 = 243 Answer: There are 243 possible assignments Example 4 (With restriction): Distribute 3 students into 2 groups, with the condition that Group 1 must have at least 1 student. Total ways: 23 = 8 Subtract invalid case (all in Group 2): 1 way Answer: 8 - 1 = 7 valid ways Example 5 (With restriction - no group empty): Four distinct balls are distributed into 2 distinct boxes such that no box is empty. Solution Without restriction: 24 = 16 Subtract cases where one box is empty: All balls in Box A → 1 way All balls in Box B → 1 way 16 - 2 = 14 Answer: 14 ways B. Distribution of Non-Distinct Objects into Groups Example 1: Distribute 10 identical candies among 4 children. Solution: ( 10+4-1 ) = ( 13 ) = 286. 4-1 3 Answer: 286 possible distributions Example 2: Arrange 12 identical books on 5 shelves, allowing empty shelves. Solution: ( +-1 ) = ( 12+5-1 ) = ( 16 ) = 1820 -1 5-1 4 Answer: 1820 possible distributions Example 3: Place 7 identical coins into 3 boxes, with each box required to contain at least one coin Total coins: 7 Boxes: 3 Reserved coins: 3 (1 per box) Remaining coins to distribute: 4 Solution: ( -1 ) = (7-1 ) = (6 ) = 15 -1 3-1 2 Answer: 15 possible distributions C. Choosing the Correct Technique Examples: Assign 4 different tasks to 3 students → distinct objects into distinct groups Distribute 6 identical balls into 4 boxes → stars and bars Choose 3 leaders from 10 students → combinations |
|---|---|
| Other Resources: | Distribution of Non-Distinct Objects into Groups: https://www.youtube.com/watch?v=iRnBryQ8RjU https://www.youtube.com/watch?v=mXn9ZNiBV5s |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and paper Scientific Calculator |
| III. Instructions: | For each problem, first write a brief plan, identify the counting principle (s) to be used, and explain your reasoning. Then solve the problem and show your complete solution. |

-----

Part I. Guided Practice Problem 1 Six different leadership kits (Notebook, Pen Set, ID Lace, T-shirt, Planner, Bag) are to be distributed among 3 committees (Logistics, Documentation, Finance). Each committee receives exactly 2 different items, and the Notebook and Planner must not be assigned to the same committee. In how many ways can the items be distributed? Plan: Divide 6 items into 3 groups of 2: distinct, fixed sizes, so a product of combinations. Apply the rule: subtract the cases where Notebook and Planner share a committee

Problem 2 Ten identical snacks packs are to be distributed among the 3 student groups (11-A, 11-B, and 11-C), Any group may receive any number of snack packs, including none. How many possible distributions are there? Plan: Share identical snacks among labeled groups: stars and bars

Problem 3 From 12 applicants, 5 leaders are selected and assigned to 5 distinct positions (President, Vice President, Secretary, Treasurer, and Auditor). Afterward, 10 identical supplies are distributed among the 5 leaders. Find the total number of possible outcomes. Plan: Select and assign 5 leaders to 5 roles: distinct, order matters, so a permutation Distribute 10 identical supplies among 5 leaders using the stars and bars method. Combine the stages: multiplication principle

Part II. Independent Activity Task 1 (advanced) Seven different school supplies are to be distributed among 3 barangay centers. Every item must be assigned to a center, and each center must receive at least 2 items. How many valid distributions are possible?

|  | Plan: Determine the possible group sizes. Since there are 7 items and each center must receive at least 2 items, the only possible group-size pattern is (3, 2, 2) Place the distinct items for each size pattern: fixed-size form, then add the size patterns Task 2 Twelve identical food packs are to be distributed among 4 evacuation centers. Each center may receive any number food packs, including none. How many distributions are possible? Show the stars-and-bars setup. Plan: Distribute identical packs among labeled centers. Apply the stars and bars method. Task 3 An organization selects 4 volunteers from 9 applicants and assigns them to 4 distinct roles. It then distributes 8 identical hygiene kits among the selected volunteers. Find the total number of possible outcomes. Plan: Select and assign 4 volunteers to 4 roles: distinct roles using permutations (since the roles are distinct and order matters). Distribute 8 identical kits among 4 selected volunteers using the stars and bars method. Combine the stages: multiplication principle |
|---|---|
| IV. Reflection: | To summarize your learning, answer each of the following questions. 1. How do you determine the order of sequence when solving a multi-step counting problem? 2. Why is it important to verify that all objects have been distributed and that each group satisfies the given conditions before performing the calculations? 3. Which problem was most challenging to set up, and what made it difficult? |

-----

| I. Activity No. 2 | Assessing Learning Outcomes |
|---|---|
| II. Materials Needed: | Notebook or paper Pen Scientific Calculator |
| III. Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify with a computation or clear reasoning. You may use a calculator. |
|  |  |

Part I. Multiple Choice Choose the letter of the best answer.

1. From 12 club members, a President, a Vice President, and a Secretary are chosen. In how many ways? A. 1,320 B. 1,728 C. 220 D. 950
2. A teacher selects 3 students from 10 to form a group. How many groups are possible? A. 30 B. 720 C. 120 D. 100
3. A shop offers 3 crusts, 4 sauces, and 5 toppings. How many one-of-each pizzas are possible? A. 12 B. 60 C. 30 D. 45
4. In how many ways can 5 identical candies be given to 3 children, where a child may receive any number? A. 10 B. 15 C. 35 D. 21
5. Which technique arranges distinct objects in order?
A. combination
B. permutation
C. stars and bars
D. the addition principle

Part II. Constructed Response Show your complete solution.

1. A committee of 4 is selected from 12 people, and then a chairperson is chosen from among the committee members.
(a) How many ways are there to select the committee?
(b) How many ways are there to select the committee and then choose its chairperson?
2. In how many ways can 7 identical pencils be distributed among 3 students, if each student must receive at least one pencil? Show the setup.

|  | Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning. 1. When objects are arranged in order, a permutation is used; when a subset is selected without regard to order, a combination is used. 2. Distributing identical objects into distinct groups uses the stars-and-bars technique. 3. Choosing a group of 3 from 10, where order does not matter, gives the same count as P(10, 3). 4. The multiplication principle is used when a task is completed in stages and the number of choices at each stage is known. 5. Stars-and-bars method is used to count the number of ways to distribute identical objects into distinct groups. |
|---|---|
| IV. Reflection: | Reflect on the lesson by answering each question clearly and concisely. 1. How do you decide whether a problem should be solved using permutations, combinations, the multiplication principle, or the stars-and-bars technique? Provide one example for each. |

-----

2. What clues in a word problem indicate that order matters, order does not matter, or identical objects are being distributed?
3. How are the different counting techniques connected, and why is it important to choose the appropriate technique when solving real-life counting problems?

|  |  |
|---|---|
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | For Remediation A. Identify the Method Name the technique for each: addition, multiplication, permutation, combination, or distribution. 1. Choosing 2 class representatives from 10 students (no roles or titles assigned). 2. Arranging 5 books on a shelf. 3. Choosing one shirt and one pair of pants from separate sets. 4. Distributing 4 identical candies among 3 students. 5. Forming a 3-digit number from digits 1 to 5, with no repetition. B. Guided Distribution (distinct objects into labeled groups) 1. In how many ways can 3 different books be distributed among 2 students, if each student may receive any number of books? 2. In how many ways can 4 different tasks be assigned to 3 workers, if each worker may be assigned any number of tasks? C. Simple Stars-and-Bars 1. Distribute 2 identical pencils among 2 students. 2. Distribute 3 identical candies among 2 students. D. Word Problem A teacher distributes 3 identical rewards to 2 students. List all possible distributions. |

*For Enhancement*

A. Name the appropriate counting technique or techniques, then justify your answer in one or two sentences.
1. Assigning 5 different projects to 3 groups, subject to a given restriction.
2. Selecting a committee and then assigning roles to its members.
3. Distributing 6 identical balls into 4 boxes.
B. Mixed Distribution with Restrictions
1. Six distinct books are to be distributed among 3 students, and Student A must receive exactly 2. How many distributions are possible?
2. Five distinct prizes are to be awarded to 4 winners, and no winner may receive more than 2 prizes. How many distributions are possible? (Challenge.)
C. Stars-and-Bars Application
1. Distribute 8 identical candies among 3 students.
2. Find the number of whole-number solutions to x₁ + x₂ + x₃ = 7 with each x at least 0.
D. Multi-Step Problem A club conducts a fair with 3 activities: assign 4 volunteers to 3 booths; distribute 6 identical posters among 3 departments; and select 5 students from 10, then assign them to 5 distinct roles. Name the technique for each step and compute each count. Identify the keywords first: arrange, choose, distribute, identical, and distinct. For remedial tasks, follow the examples from B.1 and B.2. For enhancement tasks, justify the method before solving the problem. Use stars-and-bars diagrams when appropriate, and verify your answers with a partner.

-----

**IV. Reflection:** Using what you have learned from the lesson, provide answers to each question

1. How do the keywords arrange, choose, distribute, distinct, and identical help you analyze and solve counting problems?
2. What similarities and differences did you observe among permutations, combinations, distributions, and stars-and-bars problems?
3. How can the counting techniques learned from this lesson be applied to real-life situations involving selections, assignments, and distributions?

|  |  |
|---|---|
| Unit No. & Title: | Unit 2. Probability |
| Name: | Grade & Section: |
| Lesson No. & Title | Lesson 2.1. Probability of an Event |
| Objectives: | At the end of this activity, you should be able to: 1.illustrate and describe sample spaces and events by accurately listing all possible outcomes (elements) of simple random experiments. 2. determine the probability of an event by identifying favorable and possible outcomes through systematic listing. 3. apply counting techniques (such as the fundamental counting principle) to calculate the probability of events efficiently. |
| Key Ideas: | A random experiment is a process that produces outcomes that cannot be predicted with certainty. The sample space is the set of all possible outcomes of a random experiment. An event is a subset of the sample space. The probability of an event is the ratio of the number of favorable outcomes to the total number of possible outcomes. Probability values range from 0 to 1, where 0 means the event will not occur and 1 means the event will certainly occur. |
| Examples and Illustrations | Tossing a fair coin once: Sample Space, S = {H, T} Probability of getting a head = 1 out of 2 = 1 2 Rolling a fair die: Sample Space, S = {1, 2, 3, 4, 5, 6} Probability of getting an even number = {2, 4, 6} = 3 = 1 6 2 Choosing a letter from the word MATH in a closed box: Sample Space, S = {M, A, T, H} Probability of choosing a vowel = 1 |
|  |  |

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | Pen and paper |
| III. | Instructions: | Find the Probability 1. For each item, name the sample space and find n(S). |

2. Count the favorable outcomes to find n(E).
3. Express the probability as a fraction in the simplest form. Items:
1. Roll a fair die. Find P (rolling a multiple of 3).
2. Roll a fair die. Find P (rolling a number greater than 4).
3. Toss a fair coin twice. Find P (getting exactly one head).
4. Roll two fair dice. Find P (the two numbers are the same).
5. A committee of 2 is chosen at random from 6 learners, 4 of whom are girls. Find P (both are girls). **IV. Reflection:** To summarize your learning, answer the question. What step in finding the probability was most challenging for you? Why?

**I. Activity Assessing Learning Outcomes**

**No. 2**

-----

| II. Materials Needed: | Pen and paper |
|---|---|
| III. Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify with a computation or clear reasoning. Write each probability as a fraction in lowest terms or as a decimal. |

|  | Part I. Multiple Choice Choose the letter of the best answer. 1. A die is rolled once, with sample space S = {1, 2, 3, 4, 5, 6}. The event "an even number" is which subset? A. {1, 3, 5} B. {2, 4, 6} C. {1, 2, 3, 4, 5, 6} D. { } 2. A coin is tossed twice. How many outcomes are in the sample space? A. 2 B. 3 C. 4 D. 8 3. A letter is chosen at random from the six letters of the word BANANA. P(the letter is A) is: A. 1/2 B. 1/3 C. 1/6 D. 2/3 4. One card is drawn from a standard deck of 52. P(the card is a face card, that is a Jack, Queen, or King) is: A. 1/13 B. 3/13 C. 4/13 D. 1/4 5. A committee of 2 is to be chosen from 5 people. How many possible committees are there? A. 10 B. 20 C. 25 D. 5 Part II. Constructed Response Show your complete solution. 1. A coin is tossed, and a die is rolled. (a) List the sample space and state n(S). (b) Find P (getting a head and an even number). 2. From 7 books, 3 books are chosen at random to be placed on a shelf. (a) Find n(S), the number of ways to choose 3 books. (b) If 2 particular books must both be among the 3 books chosen, find the probability. Part III. True or False with Reasoning Write True or False for each statement. Then justify your answer with a computation or a clear explanation.. 1. A probability value can equal 1.2. 2. The sample space for tossing two coins has only three outcomes: HH, HT, and TT. 3. An event is a subset of the sample space. 4. If every outcome is equally likely, then P(E) equals the number of outcomes in E divided by the number of outcomes in S. 5. In an experiment with finitely many equally likely outcomes, an event with probability 0 contains no favorable outcomes. |
|---|---|
| IV. Reflection: | Reflect on the lesson and answer each question clearly and concisely. 1. How are sample spaces and events related, and why is it important to identify them correctly before calculating probabilities? 2. How does counting the number of possible outcomes help in determining the probability of an event? Give an example from the activities. 3. Why must probability values always be between 0 and 1 inclusive, and what do these values represent in real-life situations? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Enhancement Design your own chance experiment with between 8 and 20 equally likely outcomes. |

Define one event whose probability is between one fourth and one half. State the sample space, the event, and the probability, and show your computation.

-----

|  | For Remediation For each experiment, first list the sample space in full, then circle the favorable outcomes, then write the probability. 1. Roll a fair die. Find P(rolling an odd number). 2. Draw one ball from a bag holding one red, one blue, one green, and one yellow ball. Find P(drawing the blue ball). |
|---|---|
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question For Remediation: 1. How did listing the entire sample space help you identify the favorable outcomes and compute the probability of an event? 2. What is the relationship between the number of favorable outcomes and the probability of an event? 3. Why is it important that all outcomes are equally likely when using the () formula () = ? () |

*For Enhancement:*

1. How did you choose an event whose probability falls between one-fourth and one-half, and how did the size of the sample space affect your choice?
2. What changes to your experiment would increase or decrease the probability of the event you defined?
3. How does designing your own chance experiment help deepen your understanding of sample spaces, events, and probability?

##### Lesson No. & Title Lesson 2.2. Addition of Probabilities

**Objectives:** At the end of this activity, you should be able to:

1. identify and analyze mutually exclusive events by determining whether two or more events can occur at the same time;
2. calculate the probability of the complement of an event using appropriate probability rules; and
3. compute the probability of the union of two events, considering whether the events are mutually exclusive or not. **Key Ideas:** The addition rule of probability is used to find the probability that at least one of two events occurs. If two events and are mutually exclusive, then: ( ∪ ) = () + () If two events are not mutually exclusive, then: ( ∪ ) = () + () - ( ∩ ) The complement of an event (') includes all outcomes not in . (') = 1 - ()

| Examples and | Rolling a die |
|---|---|
| Illustrations | Event A: getting an even number {2, 4, 6} Event B: getting a number greater than 4 {5, 6} |

Overlap: {6} 3 2 1 4 2 ( ∪ ) = + - = = 6 6 6 6 3 Choosing a card from a face-down standard deck Event A: drawing a heart Event B: drawing a king Events are not mutually exclusive because the king of hearts belongs to both events

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | Pen and paper |
| III. | Instructions: | Apply the Addition Rules |

-----

Solve each problem on your own. For every item, decide the case first, choose the rule, then compute. Show your work on paper and record the type and the answer below.

Instructions:

1. Name event A and event B, and list their outcomes.
2. Determine whether the events are mutually exclusive or not mutually exclusive.
3. Compute P(A or B) and simplify your answer. No. Situation Type (mutually exclusive / not) P(A or B) 1 Die: 3 or 6 2 Die: even or less than 4 3 Card: heart or spade 4 Card: heart or face card 5 Ball 1 to 6: prime or even **IV. Reflection:** To summarize your learning, answer each of the following questions.
1. How did you decide which rule to use for each item?
2. What clue told you that two events shared an outcome?
3. What mistakes should be avoided when adding probabilities?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify with a computation or clear reasoning. Decide whether the events |

overlap before adding. Part I. Multiple Choice Choose the letter of the best answer.

1. Two events are mutually exclusive when:
A. they have no common outcomes
B. they always occur together
C. one causes the other
D. they are equally likely
2. A fair die is rolled once. P(getting a 2 or a 5) is: A. 1/6 B. 1/3 C. 1/2 D. 5/6
3. If P(E) = 0.3, then the probability of the complement of E is: A. 0.7 B. 0.3 C. 0.5 D. 1.3
4. One card is drawn from a deck of 52. P(the card is a heart or a face card) is: A. 25/52 B. 11/26 C. 6/13 D. 1/4
5. Events A and B are mutually exclusive, with P(A) = 0.5 and P(B) = 0.4. P(A or B) is: A. 0.1 B. 0.2 C. 0.9 D. 0.7 Part II. Constructed Response Show your complete solution.
1. In a class, P (a student plays basketball) = 0.5, P (plays volleyball) = 0.3, and P(plays both) = 0.1. Find P(plays basketball or volleyball).
2. A number is drawn at random from 1 to 20. (a) Find P(the number is a multiple of 3 or a multiple of 5). (b) State whether the two events are mutually exclusive and explain. Part III. True or False with Reasoning Write True or False, then justify with a computation or a clear reasoning.
1. For mutually exclusive events, P(A or B) = P(A) + P(B).
2. For any two events, P(A or B) = P(A) + P(B).
3. For any event E, P(E) + P(not E) = 1.
4. If P(A) = 0.6 and P(B) = 0.7, then A and B cannot be mutually exclusive.
5. Drawing a heart and drawing a red card from a standard deck cards are mutually exclusive events.

-----

| IV. Reflection: | Reflect on the lesson and answer each question clearly and concisely. 1. What clues in a problem indicate that you should add probabilities directly, and when should you subtract the overlap? 2. How are mutually exclusive events different from overlapping events? Provide one example of each from the lesson. 3. Why is the complement rule () + ( ' ) = 1 useful when solving. |
|---|---|
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Enhancement task. A class of 40 students was surveyed. 18 like Mathematics, 15 like English, and 7 like both subjects.. Find the probability that a student selected at random likes Mathematics or English. Explain why a subtracting the overlap is necessary. Figure 1. Class Survey of 40 Students Create your own. 1. Create one situation involving mutually exclusive events then compute P(A or B). 2.Create one situation involving overlapping events, then compute P(A or B). 3. Identify the events, indicate any shared outcome, and justify the rule you used. Remedial task (with the teacher) Use two paper hoops. Write the outcomes of a die roll on separate cards and place them inside the hoops to represent two events. Count the number of outcomes in the union of the events by hand. Notice the outcomes that are counted twice when the hoops overlap. Then introduce subtraction as the correction. |
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question 1. In the survey, why is adding 18 and 15 alone incorrect? 2. In your created overlapping- event problem, which outcome(s) are shared by both events? |
| Lesson No. & Title: | Lesson 2.3. Independent Events |
| Objectives: | At the end of this activity, learners should be able to: 1. develop understanding of the concept of independent events by analyzing the relationship between two events and recognizing when the occurrence of one does not affect the occurrence of the other; 2. apply appropriate probability criteria and formulas to determine whether two events are independent in a given situation; and 3. strengthen analytical and decision-making skills by evaluating real-life and mathematical scenarios to correctly classify events as independent or dependent. |
| Key Ideas: | Two events and are independent if the occurrence of one event does not affect the occurrence of the other. Events A and B are independent if: ( ∩ ) = () ⋅ () If events are dependent, then: ( ∩ ) = () ⋅ (\|) |

![](img_p30_1.png)

-----

Independence often occurs when experiments are separate, repeated, or with replacement.

| Examples and | Tossing a coin and rolling a die (Random Experiment) |
|---|---|
| Illustrations: | A fair coin is tossed while blindfolded and a fair die is rolled after thorough shaking. |

| Event | : getting heads |
|---|---|
| Event | : rolling a 4 |
| Since the | two actions are random and performed independently, the events are |

independent.

Drawing a card with replacement (Random Experiment) A card is drawn at random from a well-shuffled deck. The card is recorded, replaced in the deck, and the deck is reshuffled before the next card is drawn. Because the card is replaced and the deck reshuffled, the second draw is not affected by the first, making the events independent.

1 1 1 ( ∩ ) = × = 2 6 12

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | For each situation, decide whether the events are independent or dependent, then compute the chance that both occur. Show your work on paper. |

1. Identify Event A and Event B.
2. Determine the type of events: independent if the probability of the second events remain unchanged. Dependent if the probability of the second event changes.
3. Compute the chance that both occur, adjusting the second chance when needed. With replacement the second chance holds; without replacement it changes. The same box gives both, side by side.

![](img_p31_1.png)

Figure 1. Same Box, With and Without Replacement

##### Type (independent / dependent)

**No. Situation P(both)**

1 Coin twice: head on both 2 Die twice: a 2 then a 5 3 Card, replace, draw: heart then heart 4 Two cards, no replacement: heart then

heart 5 Marbles with replacement (5 red, 3 blue):

red then red **IV. Reflection:** To summarize your learning, answer each of the following questions.

1. How did you decide independent or dependent for each item?
2. What steps did you follow to compute the combined chance?
3. What errors should be avoided when multiplying probabilities?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |

-----

**III. Instructions:** Answer every item. For Part II, show your complete solution. For Part III, write True

or False, then justify with a computation or clear reasoning. Decide whether the events are independent before choosing a rule. Part I. Multiple Choice Choose the letter of the best answer.

1. Events A and B are independent when:
A. P(A | B) = P(A)
B. P(A and B) = 0
C. they cannot occur together
D. P(A) + P(B) = 1
2. For independent events A and B, P(A and B) equals:
A. P(A) + P(B)
B. P(A) · P(B)
C. P(A) / P(B)
D. P(A) - P(B)
3. Which situation involves independent events?
A. drawing two cards without replacement
B. tossing a coin twice
C. choosing two class officers one after another
D. taking two balls from a bag without replacement

| 4. A fair coin | is tossed twice. P(two | heads) is: |  |
|---|---|---|---|
| A. 1/2 5. A fair die is rolled and a fair coin is tossed. P(a 6 and a head) is: | B. 1/8 | C. 1/4 | D. 1 |
| A. 1/6 | B. 1/12 | C. 1/2 | D. 7/12 |

Part II. Constructed Response Show your complete solution.

1. A fair coin is tossed and a fair die is rolled. (a) Are the two events independent? (b) Find P(tails and a number greater than 4).
2. A card is drawn from a standard deck of 52. Let A be the event the card is a King and B the event the card is a heart. (a) Find P(A and B) directly. (b) Determine whether A and B are independent.

|  | Part II. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning. 1. If two events are independent, then P(A and B) = P(A) · P(B). 2. Independent events are the same as mutually exclusive events. 3. Drawing two cards from a deck without replacement gives independent events. 4. When a fair coin is tossed twice, the result of the first toss changes the probability of the second. 5. If A and B are independent with P(A) = 0.5 and P(B) = 0.2, then P(A and B) = 0.1. |
|---|---|
| IV. Reflection: | Reflect on the lesson and answer each question clearly and concisely. 1. How can you determine whether two events are independent, and why is this important before applying the multiplication rule? 2. What is the difference between independent events and mutually exclusive events? Give one example of each from the lesson or assessment. 3. How does knowing whether one event affects the probability of another help you solve probability problems accurately? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | Remedial task (with the teacher). For each situation, identify the two events, determine whether they are independent |

or dependent, and briefly explain your answer.

1. Tossing a fair coin three times.
2. Picking two balls with replacement from a box containing 3 red and 2 blue balls.
3. Picking two balls without replacement from the same box.

-----

*Enrichment task.*

1. Create one real-life situation involving two events.
2. Identify Event A and Event B, then determine whether they are independent or dependent.
3. Compute the chance that both occur, and justify your reasoning. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question.
1. In the remedial tasks, which one changed the second chance, and why?
2. In your created situation, how do you know the events are independent or dependent?

| Lesson No. & Title | Lesson 2.4. Conditional Probability |
|---|---|
| Objectives: | At the end of this activity, learners should be able to: 1. distinguish between simple probability and conditional probability in various situations; 2. compute conditional probabilities using appropriate formulas; and 3. analyze real-life situations involving dependent events and make correct conclusions based on conditional probability. |
| Key Ideas: | Conditional probability is the probability that Event occurs given that Event has already occurred. The conditional probability of B given A is written as: (∩) () = , provided that () > 0. () Conditional probability usually involves dependent events because the occurrence of one event affects the probability of the other. The sample space changes once a condition is given. |
| Examples and Illustrations: | Drawing a card given a condition (Random Experiment) A card is drawn blindly from a well-shuffled deck. Event : the card drawn is a face card. Event : the card drawn is a king. Given that the card is a face card, the sample space is reduced to all face cards. () = 4 = 1 . 12 3 Selecting a student given prior information (Random Experiment) The name of students are written on folded pieces of paper, mixed thoroughly, and one name is drawn at random. Event : the selected student is female. Event : the selected student is a varsity athlete. The probability of is evaluated only among female students, showing conditional probability. |
|  |  |

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Solve each item and show the restricted denominator used in your solution. The items progress from table reading to drawing without replacement. |

Set A. Reading conditional probabilities from a table A survey of 200 students recorded whether each student is a member of a club and whether each plays sports.

| Student | Sports | No sport | Total |
|---|---|---|---|
| In a club | 50 | 30 | 80 |
| Not in club | 70 | 50 | 120 |
| Total | 120 | 80 | 200 |

*Club membership and sports participation.*

1. Find the probability that a student plays sports.
2. Find the probability that a student plays sports, given the student is a club.

-----

3. Find the probability that a student is a club, given that the student plays sports.

4.

Set B. Drawing without replacement

![](img_p34_1.png)

*Figure 1. Removing the first item lowers the total for the second draw.*

A box contained 5 red and 3 blue balls. Two balls are drawn one after the other without replacement. Given that the first ball drawn is red, find the probability that the second ball drawn is blue. A feeding-program tray contains 9 pandesal and 6 rice cakes. Two food items are selected one after the other without replacement. Given that the first is pandesal, find the probability that the second item selected is also pandesal. Set C. One more table A barangay surveyed 150 residents to determine whether they exercise and whether their blood pressure is normal.

| Resident | Normal | High | Total |
|---|---|---|---|
| Exercises | 40 | 20 | 60 |
| Does not | 30 | 60 | 90 |
| Total | 70 | 80 | 150 |

*Exercise habit and blood pressure.*

1. Find the probability that a resident has normal blood pressure.
2. Find the probability that a resident has normal blood pressure, given that the resident exercises.

**IV. Reflection:** Reflect on the lesson and answer each question clearly and concisely.

1. Compare your answers to Set A items 2 and 3. Why do they differ even though both use the same table?
2. In Set B, why did the total drop by one before the second draw?
3. In Set C, what does comparing the two answers suggest about exercise and blood pressure for these residents?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | Pen and paper Learning Activity Sheet |

**III. Instructions:** Answer every item. For Part II, show the denominator you used and your complete

solution. For Part III, write True or False, then justify with a computation or clear reasoning.

Part I. Multiple Choice Choose the letter of the best answer.

1. Which of the following describes a conditional probability?
A. the probability that a die shows a 4
B. the probability that it rains tomorrow
C. the probability that a learner passed, given that the learner reviewed
D. the probability that a drawn card is red
2. To compute P(A | B), the denominator should be: A. the number of outcomes in the whole sample space

-----

B. the number of outcomes in event B C. the number of outcomes in event A D. the number of outcomes in A and B

3. If P(A and B) = 0.12 and P(B) = 0.3, then P(A | B) is: A. 0.12 B. 0.3 C. 0.4 D. 0.036
4. In a group, P(owns a bike) = 0.4 and P(owns a bike and a helmet) = 0.1. P(owns a helmet | owns a bike) is: A. 0.25 B. 0.4 C. 0.1 D. 0.04
5. A card is drawn from a deck of 52. Given that it is a face card, P(it is a King) is: A. 4/52 B. 1/3 C. 1/13 D. 1/4

Part II. Constructed Response Show your complete solution.

1. The two-way table shows 40 learners grouped according to whether they use a planner and whether they submit their projects on time. (a) Find P(submitted on time | uses a planner). (b) Find P(uses a planner | submitted on time).

| On time | Not on time | Total |
|---|---|---|
| 18 | 6 | 24 |
| 8 | 8 | 16 |
| 26 | 14 | 40 |

2. In a barangay survey, P(a household has internet) = 0.6 and P(has internet and a computer) = 0.45. Find P(has a computer | has internet) and interpret the result.

Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning.

1. For any two events, P(A | B) is always equal to P(B | A).
2. A conditional probability P(A | B) restricts attention to the outcomes in B.
3. If P(B) = 0.5 and P(A and B) = 0.2, then P(A | B) = 0.4.
4. Simple probability and conditional probability are the same thing.
5. If A and B are independent, then P(A | B) = P(A). **IV. Reflection:** Reflect on the lesson and answer the question clearly and concisely. What helped you correctly identify the condition and the new sample space?

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Remediation: Use the four steps to find the conditional probability. Fill in each blank before |

computing.

1. Among 50 people, 30 own a phone. Of the phone owners, 24 use a messaging app. Find the probability that a person uses a messaging app, given that the person owns a phone.
2. Name the condition, that is, the group you are told about.
3. Count that group. This is your denominator.
4. Within that group, count those who fit the event. This is your numerator.
5. Write the probability and simplify.

For Enhancement: Use the table to compute two conditional probabilities and compare them. A cinema grouped 120 moviegoers by whether they bought popcorn and whether they bought a drink.

| Moviegoer | Drink | No drink | Total |
|---|---|---|---|
| Popcorn | 48 | 12 | 60 |
| No popcorn | 24 | 36 | 60 |
| Total | 72 | 48 | 120 |

*Popcorn and drink purchases.*

-----

1. Find P(bought a drink | bought popcorn).
2. Find P(bought popcorn | bought a drink).
3. Are the two equal? Explain why they differ. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question *For Remediation* Which number is the denominator, and why is it not 50? What would change if the condition were that the person uses a messaging app instead? *For Enhancement* Which probability would a snack-bar manager use to decide whether to bundle popcorn with a drink? What single count appears in the numerator of both probabilities?

##### Lesson No. & Lesson 2.5. Bayes' Rule Title:

**Objectives:** At the end of this activity, learners should be able to:

1. explain the concept of Bayes' Rule and its relationship to conditional probability;
2. apply Bayes' Rule correctly in solving probability problems; and
3. analyze real-life situations using Bayes' Rule and interpret results meaningfully. **Key Ideas:** Bayes' Rule is used to find the probability of an event based on prior knowledge or given conditions. It relates conditional probabilities as follows:

()⋅ ()

P() = , () > 0

()

Bayes' Rule is useful when information is updated as new evidence becomes available. Proper identification of the sample space, events, and random experiment is essential when applying Baye's Rule.

| Examples and | Medical Test Scenario (Random Experiment) |
|---|---|
| Illustrations: | A student is selected randomly from a population list using folded pieces of paper. Event : the student has a certain condition. |

Event : the student tests positive. Use Baye's Rule to determine the probability that the student has the condition given that the test result is positive.

School Assessment Scenario (Random Experiment) The names of the students are written on folded papers, mixed thoroughly, and one name is drawn randomly without looking. Event : the student belongs to the STEM strand. Event : the student passed the mathematics test. Use Baye's Rule to determine the probability that the selected student belongs to the STEM strand given that the student passed the Mathematics test.

| I. | Activity No. 1 | Practicing Learned Skill3 |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Work the guided item with your teacher, then solve the independent set. For each item, identify the prior probability, the likelihood, and the total probability before |

solving.

Guided practice Two factories supply identical phones to a store. Factory 1 and Factory 2 each supply 50% of the phones. The defect rate is 2% for Factory 1 and 4% for Factory 2. A phone is found to be defective. Find P(Factory 2 | defective). Independent practice

-----

1. A rare illness affects 1% of the population. A test detects the illness 99% of the time, but also returns a positive for 5% of healthy people. A person tests positive. Find P(illness | positive).
2. Two suppliers, A and B, each provide 50% of a particular part. The defect rate is 3% for A and 5% for B. A part is defective. Find P(supplier B | defective).
3. Machine 1 produces 80% of the bottles, Machine 2 produces 20%. The defect rate is 1% for Machine 1 and 5% for Machine 2. A bottle is defective. Find P(Machine 2 | defective). **IV. Reflection:** To summarize your learning, answer each of the following questions.
1. Across these items, what made the posterior large or small, the prior probability or the likelihood?
2. When is the posterior P(cause | result) very different from the likelihood P(result | cause)?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Answer every item. For Part II, show your complete solution. For Part III, write True or False, then justify your answer with a computation or clear reasoning. |

Part I. Multiple Choice Choose the letter of the best answer.

1. A commuter travels to school by train 70% of the time, late on 8% of train days, and by jeep 30% of the time, late on 20% of jeep days. The commuter is late on 8% of train trips and 20% of jeep trips. If the commuter is late, what is the probability that the commuter travelled by jeep? A. 0.30 B. 0.20 C. 0.52 D. 0.71
2. A factory runs two machines. Machine 1 makes 60% of the units, with a 2% defect rate. Machine 2 makes 40% of the units, with a 5% defect rate. A unit is defective. P(Machine 2 | defective) is closest to: A. 0.63 B. 0.40 C. 0.05 D. 0.50
3. In a clinic, 10% of patients have a certain condition. A test is positive for 80% of those who have it and for 10% of those who do not. A patient tests positive. P(condition | positive) is closest to: A. 0.80 B. 0.47 C. 0.10 D. 0.08
4. A sari-sari store buys eggs from two suppliers. Supplier P delivers 80% of the eggs, 3% of them cracked, and Supplier Q delivers 20%, 8% of its eggs are cracked. An egg is found to be cracked. P(Supplier Q | cracked) is closest to: A. 0.20 B. 0.08 C. 0.40 D. 0.60
5. At a palengke, Vendor X supplies 65% of the bangus, 5% of its fish are not fresh. Vendor Y supplies 35% of the bangus, and 12% of its fish are not fresh. A bangus is found to be not fresh. P(Vendor Y | not fresh) is closest to: A. 0.35 B. 0.56 C. 0.12 D. 0.44

Part II. Constructed Response Show your complete solution.

1. In a province, 5% of residents have dengue during a season. A rapid test is positive for 90% of those who have dengue and for 16% of those who do not. A resident tests positive. Find P(dengue | positive) and explain why it is well below 90%.
2. Two suppliers, X and Y, each provide 50% of a store's batteries. The defect rate is 3% for Supplier X and 4% for Supplier Y. A battery is found to be defective. Find P(supplier Y | defective).

Part III. True or False with Reasoning Write True or False, then justify with a computation or clear reasoning.

-----

1. A water district draws from Plant A for 55% of supply, contaminated 3% of the time, and from Plant B for 45% of supply, contaminated 4% of the time. Claim: given a contaminated sample, it is more likely from Plant B than from Plant A.
2. A disease affects 2% of the population. A test identifies 95% of people who have the disease and gives a positive result for 8% of those who do not. Claim: a person who tests positive has about a 95% chance of having the disease.
3. Two suppliers each provide 50% of a factory's parts. Supplier A has a 2% defect rate and Supplier B has a 6% defect rate. Claim: a defective part is three times more likely to have come from Supplier B than from Supplier A.
4. A machine is actually faulty on 1% of cycles. An alarm sounds on every faulty cycle and on 5% of normal cycles. Claim: when the alarm sounds, the machine is more likely normal than faulty.
5. Claim: for any cause and result, P(cause | result) is always equal to P(result | cause). **IV. Reflection:** Reflect on the lesson and answer each question clearly and concisely.
1. How does Bayes' Theorem help us make better decisions when new information becomes available?
2. Why is it important to consider both the prevalence of an event and the accuracy of a test before drawing conclusions?
3. How can conditional probability and Bayes' Theorem be applied in fields such as medicine, manufacturing, business, and public safety?

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper Calculator |
| III. | Instructions: | For Remediation Reading counts from a frequency table |

Use the frequency table to answer the question. A commuter reaches the office by jeepney on 60% of trips and by tricycle on 40% of trips. The table shows the outcome over 100 trips.

*Table 4. Outcomes over 100 commuter trips*

| Mode | Late | On time | Total |
|---|---|---|---|
| Jeepney | 6 | 54 | 60 |
| Tricycle | 8 | 32 | 40 |
| Total | 14 | 86 | 100 |

On a late day, find P(tricycle | late) using the table.

*For Enrichment* A canteen buys rice from three suppliers. Supplier A provides 50% of the rice with a 2% spoilage rate, Supplier B provides 30% with a 4% rate, and Supplier C provides 20% with a 5% rate. A sack of rice is found to be spoiled. Find P(A | spoiled), P(B | spoiled), and P(C | spoiled) using the generalized form of Bayes' Rule.

For Extension A courier uses a van for 55% of parcels, delayed 12% of the time, and a motorcycle for 45%, delayed 14% of the time. A parcel is delayed.

Find P(van | delayed), then decide which mode to investigate first and justify the choice. **IV. Reflection:** Using what you have learned from the lesson, provide answer to the question:

In the enrichment task, why must the three posteriors sum to 1?

##### Unit No. & Title: Unit 3. Number Theory Name: Grade & Section:

##### Lesson No. & Title: Lesson 3.1. Divisibility Properties (Proofs and Reasoning)

**Objectives:** At the end of the lesson, the learners are expected to:

-----

define divisibility: for integers a and b, a | b if there exists an integer k such that b = a · k.; examine concrete divisibility relations to identify properties (e.g., if a | b and a | c, then a | (b + c) and a | (b - c)); and justify properties of divisibility through direct argument from the definition **Key Ideas:** Divisibility Definition:

For integers a and b, a∣b means there exists an integer k such that b=a⋅k. Basic Properties of Divisibility: If a∣b and a∣c, then a∣(b+c) and a∣(b-c). If a∣b and b∣c, then a∣c. If a∣b, then a∣(b⋅k) for any integer k.

| Examples and | Example 1 - Definition of Divisibility |
|---|---|
| Illustrations | 6∣18 because 18=6⋅3. 6∤20 because 20÷6=3.33 is not an integer. |

Multiples of 6: 6, 12, 18, 24, … (visualize using a number line or array model).

Example 2 - Concrete Divisibility Relations Let a=3, b=9, c=12. 3∣9 and 3∣12. b+c=21, 21÷3=7 → 3∣(b+c). b-c=-3, -3÷3=-1 → 3∣(b-c). Therefore, 3∣(b+c) and 3∣(b-c). Example 3 - Justifying Properties of Divisibility Property: If a∣b and a∣c, then a∣(b+c). Proof: Let b=a⋅k1 and c=a⋅k2. Then b+c=a(k1+k2). Since k1+k2 is an integer, a∣(b+c).

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | Pen and paper |
| III. | Instructions: | Apply the definition of divisibility to justify each statement. Recall that for integers a and b with a ≠ 0, a \| b if and only if b = a · k, where k is an integer. Show your |

reasoning briefly and clearly.

Items

1. Given a = 2, b = 8. Justify why a | b.
2. Given a = 3, b = 9, c = 12. Justify why a | (b + c).
3. Given a = 5, b = 15, c = 25. Justify why a | (b - c).
4. Let a = 4, b = 12, c = 20. Justify why a | (b + c) and a | (b - c).
5. If a | b and a | c, justify why a | (b + c) using the definition.
6. If a | b and a | c, justify why a | (b - c) using the definition.
7. If a | b, justify why a | bc for any integer c (the multiplication property).
8. Let a, b, c be integers. If a | b and a | c, justify why a | (2b + 3c).
9. Generalize: if a | b and a | c, justify why a | (mb + nc) for any integers m and n. **IV. Reflection:** Answer each question to demonstrate your understanding of the lesson.
1. What does rewriting a number as a · k tell us about its divisibility?
2. Why must k be an integer in a | b if and only if b = a · k?
3. How does substituting b = a · k1 and c = a · k2 help justify a | (b + c) and a | (b - c)?
4. When you factor out a from b + c or b - c, what does that reveal?
5. How does the definition ensure that b + c or b - c stays divisible by a?
6. In algebraic form, why does a | (mb + nc) hold for any integers m and n?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |

-----

**III. Instructions:** Part I. Multiple Choice

Choose the letter of the correct answer. Recall that for a ≠ 0, a | b means b = a · k for an integer k.

1. The statement a | b means:
A. a is a multiple of b
B. there is an integer k such that b = a · k
C. a divided by b leaves a remainder
D. b is a factor of a
2. Given 7 | 21 and 7 | 14. Which statement must be true?
A. 7 | 35
B. 14 | 35
C. 7 | 36
D. 14 | 21
3. If a | b and a | c, which of the following is guaranteed?
A. a | (b · c) only
B. a | (b + c) but not a | (b - c)
C. a | (b + c) and a | (b - c)
D. a | (b + c) only when b is greater than c
4. Consider the claim: if a | b, then a | (b + c) for any integer c. Which choice correctly evaluates it?
A. True, because a | b
B. True, because addition preserves divisibility
C. False; for example 4 | 8 but 4 does not divide 8 + 10
D. False; division is not closed
5. If a | b, which statement is always true for any integer m?
A. a | (b + m)
B. a | (mb)
C. a | (b - m)
D. m | b
6. If a | b and a | c, then b = ak1 and c = ak2 for some integers k1 and k2. Which expression shows why a | (mb + nc) for any integers m and n?
A. a(mk1 + nk2)
B. a(k1 + k2)
C. mk1 + nk2
D. a(b + c + 1)

Part II. Constructed Response Write a complete justification for each statement, starting from the definition of divisibility.

1. If a | b and a | c, prove that a | (b - c).
2. If a | b, prove that a | 9b.
3. If a | b and a | c, prove that a | (3b + 2c).

|  | Part III. True or False with Reasoning Write True or False for each statement, then give one sentence of reasoning. 1. If b \| a, then a \| b. 2. If a \| b and a \| c, then a \| (b + c). 3. 8 \| 4 is a true statement. 4. If a \| b, then a \| (b + a). 5. If 5 \| n, then 5 \| 10n. 6. If a \| (b + c), then a \| b and a \| c |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the key idea you should remember when proving that one integer divides another? 2. How do the properties of divisibility support mathematical reasoning and proof writing? 3. How can the concept of divisibility be applied in other areas of mathematics such as factors, multiples, and number theory? |

-----

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Remediation Review the definition of divisibility, a \| b means b = a · k with k an integer. For each |

statement, decide if it is true or false and show the integer k that proves your answer.

| Statement | True or false | Justification (integer k) |
|---|---|---|
| a. 4 \| 12 |  |  |
| b. 6 \| 20 |  |  |
| c. 5 \| 25 |  |  |
| d. 9 \| 27 |  |  |
| e. 8 \| 30 |  |  |

Then write one sentence explaining what it means for a number to divide another exactly.

|  | For Enhancement Apply the definition and properties of divisibility to prove or disprove each statement. Show your reasoning. 1. If a \| b and b \| c, then a \| c. 2. Decide whether the converse of the sum property holds: if a \| (b + c), must a \| b and a \| c? Prove it or give a counterexample. |
|---|---|
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question. 1. How do definitions, proofs, and counterexamples work together to establish mathematical truths? 2. What strategies are most effective when proving or disproving divisibility statements? 3. How does a deeper understanding of divisibility help in studying other topics in number theory and algebra? |

**Lesson No. & Title: Lesson 3.2. Primes, Fundamental Theorem of Arithmetic, Prime Factorization**

**Objectives:** At the end of the term, the learners are expected to:

1. distinguish prime and composite integers based on the number of positive divisors.
2. list prime numbers up to a given bound using the Sieve of Eratosthenes.
3. state the Fundamental Theorem of Arithmetic from observation of repeated factorizations of integers.
4. formulate the prime factorization of given positive integers. **Key Ideas:** Prime numbers are integers greater than 1 with exactly two positive divisors: 1 and the number itself.

Composite numbers have more than two positive divisors.

The Sieve of Eratosthenes is a systematic method for listing prime numbers up to a given bound by eliminating multiples.

The Fundamental Theorem of Arithmetic states that every integer greater than 1 can be expressed uniquely as a product of prime numbers, regardless of the order of factors.

Prime factorization is the process of breaking down a composite number into its prime factors, often expressed in exponential form.

| Examples and | Prime vs. Composite: |
|---|---|
| Illustrations | 7 → Divisors: 1, 7 → Prime 12 → Divisors: 1, 2, 3, 4, 6, 12 → Composite |

Sieve of Eratosthenes (up to 30):

-----

|  | Primes identified: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 Prime Factorization: 36 = 2² × 3² • 60 = 2² × 3 × 5 • 84 = 2² × 3 × 7 Fundamental Theorem of Arithmetic Illustration: 120 can be factored as 2 × 60, 3 × 40, or 10 × 12, but all lead to the same prime factorization: 2³ × 3 × 5. |
|---|---|
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and paper |
| III. Instructions: | Part 1. Prime or composite For each number, state prime or composite and give the number of positive divisors: 17, 21, 29, 35, 49, 51, 53, 57. Part 2. Prime factorization Write the prime factorization of each number in exponential form. Check your work by multiplying the factors. 72, 90, 120, 150, 210 |
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. How do you decide quickly whether a number is prime or composite? 2. Which numbers in Part 2 were hardest to factor, and what made them harder? 3. How can you be sure your factorization is complete? |
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | pen and paper |
| III. Instructions: | Part I. Multiple Choice Choose the letter of the correct answer. 1. Which number is prime? A. 1 B. 21 C. 23. D. 27 2. How many positive divisors does a prime number have? A. 1. B. 2. C. 3. D. it depends on the prime 3. How many distinct prime numbers appear in the prime factorization of 60? A. 2. B. 3. C. 4. D. 5 4. Which is the correct prime factorization of 72? A. 8 × 9. B. 2³ · 3². C. 2² · 3³. D. 2³ · 3 5. Which statement about the number 1 is true? A. 1 is prime B. 1 is composite C. 1 is neither prime nor composite D. 1 has exactly two divisors 6. By the Fundamental Theorem of Arithmetic, the prime factorization of an integer greater than 1 is: A. unique except for the order of the factors B. unique only for even numbers C. different for each factor tree D. never unique Part II. Constructed Response Show your complete work. 1. Write the prime factorization of 84 in exponential form, then state in one sentence why it is unique according to the Fundamental Theorem of Arithmetic. 2. Use the Sieve of Eratosthenes to list all prime numbers from 1 to 30. |

-----

|  | Part III. True or False with Reasoning Write True or False for each statement, then give one sentence of reasoning. 1. Every even number is composite. 2. 1 is a prime number. 3. The number 51 is prime. 4. The factorization 180 = 2² · 3² · 5 is correct. 5. A number can have two different prime factorizations. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly 1. After working on prime factorization and correcting errors, think about what you learned: 2. What does the uniqueness of prime factorization tell you about the structure of numbers? 3. How did identifying and fixing errors help you understand the Fundamental Theorem of Arithmetic better? 4. Write a short paragraph explaining how accuracy in factorization builds confidence in solving math problems and why this principle is important in both classroom tasks and real-world applications. |
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | Pen and Paper Calculator |
| III. Instructions: | For Remediation: Write the prime factorization of each number in exponential form. Build a factor tree if it helps, and break every factor down until only primes remain. 1. 18 2. 28 3. 45 4. 100 For Enhancement: The exponents in a prime factorization can count the divisors of a number. For each number, write its prime factorization, then add one to each exponent and multiply to find how many positive divisors it has. 1. 72 2. 360 |
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question. 1. How does prime factorization serve as a foundation for other number theory concepts such as divisibility, GCD, and LCM? 2. What relationship did you observe between a number's prime factorization and its divisors? 3. How can prime factorization be used to solve more complex mathematical problems efficiently? |
| Lesson No. & Title: | Lesson 3.3. Computing Greatest Common Divisor (GCD) and Least Common Multiple (LCM) of Two Positive Integers Using Prime Factorization and the Euclidean Algorithm |
| Objectives: | At the end of the lesson, you are expected to: 1. define GCD and LCM through examples of common divisors and common multiples of pairs of integers: 2. compute the GCD and LCM of two positive integers using prime factorization; 3. examine the iterative division process on small examples to recognize the basis of the Euclidean algorithm; 4. state and justify the Euclidean algorithm: gcd(a, b) = gcd(b, a mod b); 5. compute the GCD of two positive integers using the Euclidean algorithm; 6. compute the LCM of two positive integers using the relation a · b = gcd(a, b) · lcm(a, b); and 7. compare the efficiency of prime factorization and the Euclidean algorithm for inputs of different sizes. |

-----

**Key Ideas:** Greatest Common Divisor (GCD) is the greatest positive integer that divides two or

more integers exactly. It is useful in equal grouping and fair distribution.

Least Common Multiple (LCM) is the smallest positive integer that is a multiple of two or more integers. It is useful in repeated events and scheduling.

Prime Factorization expresses a composite number as a product of prime numbers. It helps determine GCD (using the lowest exponents of common primes) and LCM (using the highest exponents of all primes).

Euclidean Algorithm is an efficient method for finding the GCD through repeated division until the remainder becomes zero.

|  | Modular Arithmetic represents the remainder after division using modulo notation. |
|---|---|
| Examples and Illustrations: | Example 1: Finding GCD and LCM Using Prime Factorization Find the GCD and LCM of 24 and 36. Prime factorization: 24 = 23 × 3 36 = 22 × 32 GCD (use lowest exponents): L CM (use highest exponents): Example 2: Finding GCD Using the Euclidean Algorithm Find: gcd(48,18) 48 = 18(2)+ 12 18 = 12(1)+ 6 12 = 6(2)+0 Therefore: Example 3: Finding LCM Using the GCD-LCM Relationship Find: lcm(12,18) Given: gcd(12,18) = 6 Use: ∙ = gcd(, ) ∙ (, ) 12 ∙ 18 = 6 ∙ (12,18) 216 = 6 ∙ (12,18) (12,18) = 36 |

**Other Resources:** Textbook: Crisman, Karl-Dieter. Number Theory: In Context and Interactive. Gordon

College, 2024. Video Lesson: Khan Academy - Greatest Common Divisor, Least Common Multiple, and Modular Arithmetic Lessons Additional Resources: Calculator, paper, pen, whiteboard, online math tools for factorization and modular arithmetic

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | pen and paper, calculator |
| III. | Instructions: | Part 1. Prime factorization Find the GCD and the LCM of each pair using prime factorization. |

1. 18 and 24
2. 40 and 60

Part 2. Euclidean algorithm and the product relation Find each GCD by the Euclidean algorithm, then find the LCM using the product relation.

1. gcd(84, 30), then lcm(84, 30)
2. gcd(120, 45), then lcm(120, 45)

-----

Part 3. Compare the methods Find gcd(204, 85) by the Euclidean algorithm. Then explain why prime factorization would be slower for this pair. **IV. Reflection:** Answer each question to demonstrate your understanding of the lesson.

1. Which method did you choose for each part, and why?
2. In the Euclidean algorithm, how did you know when to stop?
3. How did you get each LCM once you had the GCD?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | paper, pen, calculator |
| III. | Instructions: | Part I. Multiple Choice Choose the letter of the correct answer. |

1. The greatest common divisor of two integers is:
A. the greatest shared multiple of the two
B. the smallest divisor of both
C. the greatest positive integer that divides both exactly
D. the remainder when one is divided by the other
2. What is lcm(6, 8)? A. 2. B. 14 C. 24. D. 48
3. Which method is generally more efficient for the GCD of large integers?
A. listing all divisors
B. prime factorization
C. the Euclidean algorithm
D. repeated addition
4. In the Euclidean algorithm, the GCD is:
A. the last quotient
B. the last nonzero remainder
C. the first remainder
D. the final 0
5. If gcd(a, b) = 6 and lcm(a, b) = 180, then a · b equals: A. 30. B. 180. C. 1080. D. 6
6. A student says gcd(84, 126) = 21 because both are divisible by 21. This is:
A. correct, because any common divisor is the GCD
B. incorrect, because 42 is a common divisor and is greater than 21
C. correct, because 84 + 126 is divisible by 21
D. incorrect, because 21 does not divide 126

Part II. Constructed Response Show your complete solution. Use the Euclidean algorithm to compute gcd(72, 30). Show each division step. Find lcm(18, 24) using prime factorization, then verify it with the relation a · b = gcd(a, b) · lcm(a, b).

|  | Part III. True or False with Reasoning Write True or False for each statement, then give one sentence of reasoning. 1. The GCD of two numbers is always less than or equal to the smaller number. 2. lcm(a, b) always equals a · b. 3. In the Euclidean algorithm, gcd(a, b) = gcd(b, a mod b). 4. gcd(8, 9) = 1. 5. For larger integers, prime factorization is always faster than the Euclidean algorithm. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What key idea from today's lesson will help you solve future problems involving GCD and LCM? 2. How can checking your work using the formula ⋅ = gcd(, ) ⋅ lcm(, ) i mprove accuracy? |

-----

|  | 3. How are GCD and LCM useful in real-life situations involving scheduling, grouping, sharing, or synchronization of events? |
|---|---|
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and Paper calculator |
| III. Instructions: | For Remediation: Find GCD and the LCM of each pair using prime factorization. Show each factorization. 1. 12 and 18 2. 20 and 30 3. 16 and 24 For Enhancement: Work with the three numbers 24, 36, and 60. Find their GCD and LCM using prime factorization. Then test whether the two-number product relation extends: does 24 · 36 · 60 equal the GCD times the LCM? Find gcd(24, 36, 60) and lcm(24, 36, 60). Compare 24 · 36 · 60 with gcd · lcm, and explain what you find. |
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question. 1. How can prime factorization be used as a powerful tool for solving problems involving common factors and multiples? 2. What similarities and differences did you observe between finding the GCD and finding the LCM? 3. How can understanding GCD and LCM help solve real-life problems involving grouping, scheduling, and synchronization? |
| Lesson No. & Title: | Lesson 3.4. Solving Linear Diophantine Equations Using the Euclidean Algorithm |
| Objectives: | At the end of the lesson, you are expected to: 1. define a linear Diophantine equation in two variables of the form ax+by=c; 2. determine whether integer solutions exist using the condition that gcd(a,b) divides c; 3. apply the Extended Euclidean Algorithm to express the GCD as a linear combination of two integers; 4. solve linear Diophantine equations by finding one particular solution; 5. generate the general solution of a linear Diophantine equation; and 6. solve real-life problems involving exact totals, combinations, and allocation using linear Diophantine equations. |
| Key Ideas: | A linear Diophantine equation has the form: + = where , , and are integers, and the solutions must be integers. Integer solutions exist if and only if: (, ) ∣ The Euclidean Algorithm helps determine the GCD efficiently. The Extended Euclidean Algorithm expresses the GCD as a linear combination of the coefficients. If integer solutions exist, there are often infinitely many possible solutions that follow a general pattern. |
| Examples and Illustrations | Example 1: Checking Existence of Integer Solutions Determine whether the equation has integer solutions: 12 + 18 = 6 Find the GCD: gcd(12,18) = 6 Check divisibility: 6 ∣ 6 Since the GCD divides the constant term, integer solutions exist. Example 2: Solving Using the Euclidean Algorithm |

-----

|  | Find (20,35). 35 = 20(1)+ 15 20 = 15(1)+ 5 15 = 5(3)+0 Thus: Example 3: Linear Combination Express (20,35) as a linear combination. From: 5 = 20 - 15 and 15 = 35 - 20 Substitute: 5 = 20 -(35 - 20) 5 = 2(20)- 35 Thus: 5 = 2(20)- 1(35) |
|---|---|
| Other Resources: | Textbook: Burton, David M. Elementary Number Theory. Crisman, Karl-Dieter. Number Theory: In Context and Interactive. Video Lesson: Khan Academy - Greatest Common Divisor, Least Common Multiple, and Modular Arithmetic Lessons |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and paper, calculator |
| III. Instructions: | Part 1. Guided Practice, Existence Check Decide whether each equation has integer solutions by checking whether the GCD of the coefficients divides the constant term. 8x + 12y = 20 6x + 10y = 15 9x + 15y = 12 Part 2. Independent Practice, Full Solution Solve each equation completely. Check existence, use the extended Euclidean algorithm to find one particular solution, then write the general solution. 14x + 22y = 10 27x + 45y = 18 |
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. How did you decide existence in Part 1 without solving? 2. In Part 2, how did back-substitution give a particular solution? 3. How did you write the general solution once you had one particular solution? 4. How can you verify a solution you generated? |
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | pen and paper, calculator |
| III. Instructions: | Read each item carefully. Show complete solutions where required and use proper notation. Part I. Multiple Choice 1. Which equation is a linear Diophantine equation in two variables, with integer solutions sought? A. 3x + 2 = 11 B. 4x + 7y = 10 C. x² + y = 9 D. 2.5x + y = 6 2. ax + by = c has integer solutions if and only if: A. a and b are prime B. gcd(a, b) divides c C. c divides gcd(a, b) |

-----

D. a + b divides c

3. Which equation has no integer solution?
A. 4x + 6y = 10
B. 6x + 9y = 21
C. 8x + 12y = 14
D. 5x + 10y = 15
4. The extended Euclidean algorithm is used to:
A. find only positive solutions
B. express gcd(a, b) as a linear combination of a and b
C. approximate the solutions
D. eliminate one variable
5. Once one particular solution of ax + by = c is known, the equation has:
A. exactly one solution
B. no other solution
C. infinitely many integer solutions
D. only positive solutions
6. For 6x + 9y = 21, gcd is 3 and (2, 1) is a particular solution. The general solution is:
A. x = 2 + 3t, y = 1 - 2t
B. x = 2 + 2t, y = 1 - 3t
C. x = 2 + 9t, y = 1 - 6t
D. x = 2 + 6t, y = 1 - 9t

Part II. Constructed Response

1. Show that the equation 9x + 15y = 21 has integer solutions, find one particular solution, and write the general solution.
2. A baker sells cupcakes at P30 and cookies at P20. A customer spends exactly P180. Write the equation, decide whether whole-number combinations exist, and give two combinations.

|  | Part III. True or False with Reasoning Write True or False for each statement, then give one sentence of reasoning. 1. Every linear Diophantine equation of the form ax + by = c has at least one integer solution. 2. If gcd(a, b) = 1, then ax + by = c has integer solutions for every integer c. 3. A linear Diophantine equation that has one solution has infinitely many integer solutions. 4. The extended Euclidean algorithm expresses gcd(a, b) as a · m + b · n for some integers m and n. 5. To get a particular solution of ax + by = c from gcd(a, b) = a · m + b · n, multiply m and n by c. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the first step you should take when solving a linear Diophantine equation? Why? 2. How does the concept of divisibility connect to the existence of solutions in Diophantine equations? 3. How can linear Diophantine equations be used to solve practical problems involving exact amounts, resource allocation, or combinations of items? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Remediation A canteen sells sandwiches at P35 each and juice at P25 each. A class spends |

exactly P700. Let x be the sandwiches and y the juice.

1. Write the equation and identify a, b, and c.
2. Find gcd(35, 25) and check whether it divides 700.
3. Find one whole-number combination and verify it.

-----

*For Enhancement* Plan the seminar meal set. A council buys meal sets at P80 each and snack packs at P50 each, with a budget of exactly P6,000. Each group acts as a planning team.

1. Decide whether whole-number plans exist and write the general solution.
2. List all plans that use no negative counts and say how many there are.
3. Choose the most balanced plan and defend it in a short statement. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question
1. Why is the number of possible plans limited rather than unlimited here?
2. Which plan would you choose, and what makes it the most practical for the seminar?

| Lesson No. & Title: | Lesson 3.5. Congruence Modulo m: Properties and Modular Arithmetic Operations |
|---|---|
| Objectives: | At the end of the lesson, you should be able to: 1. examine remainders of integers under division by a fixed positive integer m to identify equivalence classes; 2. define congruence modulo m: a ≡ b (mod m) if and only if m \| (a - b); 3. Illustrate congruence modulo m using cyclic systems (clocks, days of the week, calendar); 4. investigate basic properties of congruence: reflexive, symmetric, transitive; congruence preserved under addition, subtraction, and multiplication. 5. justify properties of congruence using the definition; 6. perform addition, subtraction, and multiplication of integers modulo m; and 7. compute modular powers of integers using repeated squaring. |
| Key Ideas: | Modulo Operation vs. Congruence: The modulo operation produces a single remainder value, while a congruence ≡ ( ) expresses a relationship between two integers that share the same remainder when divided by . |

Equivalence Classes (Remainder Families): Integers that behave the same way (leave the same remainder) when divided by a modulus belong to the same equivalence class.

| Modulo Congruence: It is a relationship where two integers | and | are congruent |
|---|---|---|
| modulo , if and only if their difference ( - ) | is divisible by | (written as |

≡ ( ) ⟺ | ( - ).

Cyclic and Repeating Systems: Modular arithmetic describes cyclic behavior where values return to the same position after a fixed number of steps, such as hours on a clock (mod 12), days of the week (mod 7), or dates on a calendar.

Fundamental Properties: Congruence modulo satisfies the reflexive, symmetric, and transitive properties, which may be justified using the divisibility definition of congruence. Reflexive: ≡ ( ) ( every number is congruent to itself). Symmetric: If ≡ ( ), then ≡ ( ). Transitive: If ≡ ( ) and ≡ ( ), then ≡

( ).

Modular Arithmetic: Congruence is preserved under addition, subtraction, and multiplication. This property allows large numbers to be reduced to their remainders before calculating, making computations simpler and more efficient. manageable. If ≡ ( ) and ≡ ( ), then the following rules apply:

| Addition: | + ≡ + ( | ) |
|---|---|---|
| Subtraction: | - ≡ - ( | ) |

Multiplication: ≡ ( )

Repeated Squaring: This method allows for the efficient calculation of large powers by breaking down exponents and reducing intermediate results modulo

-----

| Examples and | Modulo | Operation |
|---|---|---|
| Illustrations | Example: 23 | 4 = 3 |

![](img_p50_1.png)

Modulo Congruence (Same Remainder) *Example: 19* 5 = 4 and 9 5 = 4 Since 19 and 9 have the same remainder when divided by 5 then:

≡ ( ) Read as: "19 is congruent to 9 modulo 5" Also 19 - 9 = 10 and 5 | 10 Therefore: | ( - ) Equivalence Class (Remainder Family) *Example:*

Since these integers leave the same remainder when divided by 5, they belong to the same equivalence class modulo 5.

They also satisfy the divisibility definition of congruence:

Cyclic and Repeating Systems Clock System. A 12-hour clock repeats its cycle every 12 hours. After reaching 12, the count returns to 1 *Example: Suppose it is 8:00 and 7 hours pass* Calculation: 8 +7 = 15 Congruence: 15 ≡ 3( 12) Result: The clock will show 3:00

4 5 = 4 9 5 = 4 14 5 = 4 19 5 = 4

≡ ( ) ⟺ | ( - )

5 | (9 - 4) ⟶ 5 | 5 5 | (14 - 4) ⟶ 5 | 10 5 | (19 - 4) ⟶ 5 | 15

![](img_p50_2.png)

Days of the Week. The days of the week repeat every 7 days, making modulus 7. To use modular arithmetic, days are assigned numerical values: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, and Saturday= 6. *Example: Suppose today is Tuesday (2) and 10 days pass.* Calculation: 2 +10 = 12 Congruence: 12 ≡ 5( 7) because dividing 12 by 7 leaves a remainder of 5 Result: Since 5 corresponds to Friday, the day will be Friday.

![](img_p50_3.png)

Calendar Cycles. Calendar systems use different moduli depending on the number of days in a specific month *Example: A meeting is scheduled every 30 days and first occurs on April 12.* Calculation: 12 + 30 = 42

-----

Congruence: 42 ≡ 12 ( 30). The modulus is 30 since April has 30 days. Result: After one complete 30-day cycle, the meeting returns to the 12th day of the next month, which is May 12.

Fundamental Properties *Example:*

| Reflexive: 12 ≡ 12 ( | 5) | is true becaue 5 \| (12 - 12) ⟶ 5 \| 0 |
|---|---|---|
| Symmetric: Since 17 ≡ 5( | then 5 ≡ 17 ( | 6). |

Transitive: If 20 ≡ 8 ( 6) and 8 ≡ 2 ( 6), it follows that 20 ≡ 2( 6) Modular Arithmetic Addition, subtraction, and multiplication preserve congruence modulo m. Therefore, large numbers may first be reduced to their remainders before performing the operations. *Example:* Find the , + is divided by 11.

| Reduce each term: | 2,370 ≡ 5 ( 489 ≡ 5( | 11) 11) |
|---|---|---|
| Add the residues: | 2,370 + 489 ≡ 5+ 5( | 11) |

2,370 +489 ≡ 10( 11) Therefore, the remainder is 10. Find the remainder when ( ∙ )- is divided by 9.

| Reduce each term: | 487 ≡ 1( 23 ≡ 5( 152 ≡ 8( | 9) 9) 9) |
|---|---|---|
| Apply operations: | (487 ∙ 23) -152 ≡ (1 ∙ 5)- 8 ( | 9) |

(487 ∙ 23) -152 ≡ -3 ( 9) Convert negative residue to least positive residue (add the modulus repeatedly *until the result is non-* *negative and less than the* *modulus (-3 + 9 = 6):* (487 ∙ 23) - 152 ≡ 6 ( 9) Therefore, the remainder is 6. Repeated Squaring *Example:* Compute 34( 5)

Rewrite 34 ∶ 34 = (32)2 Reduce 32 modulo 5

| (32 = 9; 9( | 5) = 4): | 32 ≡ 4( | 5) |
|---|---|---|---|
| Square the result | to get 3 : | (32)2 ≡ 42( 34 ≡ 16( | 5) 5) |
| Reduce: |  | 34 ≡ 1 ( | 5) |
| ( | ) = | ≡ ( | ). |

**Other Resources:** Burton, D. M. (2011). Elementary Number Theory (7th ed.). Chapter 4: Theory of

Congruences, McGraw-Hill Companies, Inc. pp 61-84 Crisman, K.-D. (2024). Number Theory in Context and Interactive (6th ed.). https://math.gordon.edu/ntic/nticoneside.pdf Mathunlocked. (2024). Modular Arithmetic: basic and beyond [Video]. YouTube. https://www.youtube.com/watch?v=NFg6cw7vMuU

##### I. Activity Practicing Learned Skills

##### No. 1

| II. | Materials Needed: | pen and paper calculator |
|---|---|---|
| III. | Instructions: | Part 1. Guided Practice, Verify a Congruence |

-----

|  | Decide whether each statement is true using the rule that a ≡ b (mod m) exactly when m divides a - b. 38 ≡ 14 (mod 6) 50 ≡ 27 (mod 8) 41 ≡ 13 (mod 7) Part 2. Independent Practice, Operate Modulo m Reduce each number first, then compute. Give the least residue. (29 + 18) mod 7 (34 · 23) mod 5 (56 - 39) mod 9 Part 3. Independent Practice, Modular Powers Use repeated squaring. Reduce after each step. 2 to the 20th power modulo 7 3 to the 10th power modulo 11 Part 4. Independent Practice, Name the Property State which property of congruence each statement shows. 19 ≡ 19 (mod 4) If 23 ≡ 11 (mod 4), then 11 ≡ 23 (mod 4). If 25 ≡ 5 (mod 4) and 5 ≡ 1 (mod 4), then 25 ≡ 1 (mod 4). |
|---|---|
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. How did you verify a congruence without dividing it twice? 2. How did reducing first keep your operations simple? 3. How did you choose which squares to combine for a power |
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Part I. Multiple Choice Choose the letter of the correct answer. 1. Which statement is true? A. 23 ≡ 5 (mod 6) B. 23 ≡ 3 (mod 6) C. 23 ≡ 4 (mod 5) D. 23 ≡ 2 (mod 5) 2. If today is Monday, what day will it be 30 days from now? A. Monday B. Tuesday C. Wednesday D. Thursday 3. Which property is shown by 31 ≡ 31 (mod 6)? A. symmetric B. reflexive C. transitive D. multiplicative 4. Which statement about (7 · 8) mod 5 is correct? A. 56 ≡ 1 (mod 5) B. 56 ≡ 6 (mod 5) C. 7 · 8 ≡ 2 · 3 (mod 5) D. both A and C 5. Using repeated squaring, 2 to the 10th power modulo 7 equals: A. 1 B. 2 C. 4 D. 8 6. Congruence modulo m is preserved under which operations? A. addition only |

-----

B. multiplication only C. addition, subtraction, and multiplication D. division Part II. Constructed Response

1. Given 38 ≡ 14 (mod 6), show that 14 ≡ 38 (mod 6) using the definition of congruence, and name the property applied.
2. Compute (45 + 29) mod 8 and (45 · 29) mod 8 using least residues. Show the reductions.

|  | Part III. True or False with Reasoning 1. a ≡ a (mod m) holds for every integer a. Decide and give a reason. 2. If a ≡ b (mod m), then a and b leave different remainders modulo m. Decide and give a reason. 3. If a ≡ b (mod m) and c ≡ d (mod m), then a + c ≡ b + d (mod m). Decide and give a reason. 4. Congruence modulo m is transitive. Decide and give a reason. 5. To compute a large power modulo m, you must first compute the full power and then divide. Decide and give a reason. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What strategy did you find most useful when solving modular arithmetic problems? 2. How does repeated squaring make it easier to compute large powers modulo ? 3. How can modular arithmetic be applied in areas such as calendars, cryptography, computer science, and everyday counting systems? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Remediation 1. Work modulo 5 with small steps. |

2. Find the remainder of 23, 47, and 38 modulo 5.
3. Compute (23 + 47) mod 5 and (23 · 38) mod 5 by reducing first.
4. Let Sunday = 0 through Saturday = 6. If today is Tuesday, find the day 12 days from now using modulo 7.

For Enhancement Units digit of a large power. The units digit of a number is its remainder modulo 10. Use modular arithmetic to find units of digits without computing the whole power.

1. Find the units digit of 3 to the 200th power by working modulo 10.
2. Find the units digit of 7 to the 100th power by working modulo 10.
3. Describe the repeating cycle of unit's digits for each base. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question
1. Why does working modulo 10 give the units digit?
2. How does a short repeating cycle make a very large power easy

##### Lesson No. & Title: Lesson 3.6. Solving Linear Congruences

**Objectives:** At the end of the lesson, the students should be able to:

1. define a linear congruence as an equation of the form ax ≡ b (mod m);
2. examine small cases of ax ≡ b (mod m) by testing residues to identify when a solution exists;
3. state the existence condition: a linear congruence ax ≡ b (mod m) has a solution if and only if gcd(a, m) divides b;
4. investigate cases where solutions exist to observe the number of incongruent solutions modulo m (specifically, gcd(a, m) solutions when the existence condition holds);
5. define the modular inverse of a modulo m and identify when it exists (when gcd(a, m) = 1);
6. compute modular inverses using the extended Euclidean algorithm.
7. solve linear congruences ax ≡ b (mod m) using the modular inverse method when gcd(a, m) = 1; and

-----

|  | 8. solve linear congruences using reduction (dividing through by gcd(a, m)) when gcd(a, m) > 1 and divides b. |
|---|---|
| Key Ideas: | Linear Congruence: A linear congruence is an equation of the form ≡ (mod ). Existence of Solutions: A linear congruence ≡ (mod ) has a solution if and only if gcd(, ) ∣ . No Solution Condition: If gcd(, ) ∤ , then the linear congruence has no solution. Number of Incongruent Solutions: If gcd(, ) = and ∣ , then the congruence has incongruent solutions modulo . Methods for Solving Linear Congruences: Solving Using Modular Inverse: When gcd(, ) = 1, a linear congruence may be solved by multiplying both sides by the modular inverse of . Modular Inverse: The modular inverse of modulo is an integer -1 such that -1 ≡ 1(mod ). A modular inverse exists only when gcd(, ) = 1. Extended Euclidean Algorithm: The Extended Euclidean Algorithm can express the gcd of two integers as a linear combination in the form 1 = + which helps determine the modular inverse of modulo . Reduction Method: When gcd(, ) = > 1 and ∣ , divide the coefficient, constant term, and modulus by to obtain an equivalent reduced congruence. |
| Examples and Illustrations | Linear Congruence: Example: You bought candies in packs of 9 and repacked them into groups of 6. At the end of the day, 2 candies were left over. Let: original 9-candy packs = total candies = 9 leftover = 2 The situation can be expressed as: 9 ≡ 2( 6) This is an example of a linear congruence of the form: ≡ ( ) |

*Example: Determine whether 3 - 8 ≡ 10 (* congruence form. 3 -8 ≡ 10 ( transform it, add 8 on both sides to have:

The congruence congruence form = ≡ ( Existence and No Solutions Condition

If gcd(, ) ∤ *Example: Determine whether 9 ≡ 2(* But 3 does not divide 2, written as: 3 ∤ 2 Therefore, the congruence has no solution.

| Existence | and | Number of Solutions |
|---|---|---|
| If has a solution, and there are | (, | ) \| |
| modulo |  | . |

11) is in linear
11) is not yet in the linear congruence form. To 3 - 8+ 8 ≡ 10 +8( 11) 3 ≡ 18( 11) ≡ ( ) is now in the standard linear )

, then ≡ (mod m) has no solution.

6) has a solution. gcd(9,6) = 3

, then the linear congruence ≡ ( )

= (, ) incongruent solutions

-----

*Example: Solve: 6 ≡ 4(* 8).

gcd(, ) = gcd(6,8) = 2 Since 2 divides 4, written as 2 | 4, solution exists. Number of incongruent solutions is 2. Use trial-and-error to determine the solutions of 6 ≡ 4( 8).

|  | 6 | 6 ( 8) | Is it equal to 4( 8)? |
|---|---|---|---|
| 0 | 0 | 0 ≡ 0( 8) | No |
| 1 | 6 | 6 ≡ 6( 8) | No |
| 2 | 12 | 12 ≡ 4( 8) | Yes |
| 3 | 18 | 18 ≡ 2( 8) | No |
| 4 | 24 | 24 ≡ 0( 8) | No |
| 5 | 30 | 30 ≡ 6( 8) | No |
| 6 | 36 | 36 ≡ 4( 8) | Yes |
| 7 | 42 | 42 ≡ 2( 8) | No |

Therefore, the solutions for are ≡ 2,6 ( 8). Trial-and-error works for small moduli but becomes inefficient for large numbers. In such cases, linear congruences may be solved using: Modular inverse method when gcd(, )= 1 Reduction method when gcd(, ) = > 1 and | Finding Modular Inverse *Example: Find the modular inverse of 3(* 5) By trial-and-error, determine a value of such that 3 will have a remainder of 1 under modulo 5

|  | 3 | 3( 5) |
|---|---|---|
| 0 | 0 | 0 ≡ 0( 5) |
| 1 | 3 | 3 ≡ 3( 5) |
| 2 | 6 | 6 ≡ 1( 5) |
| 3 | 9 | 9 ≡ 4( 5) |
| 4 | 12 | 12 ≡ 2( 5) |

Since 3(2) ≡ 1( 5), then the modular inverse of 3 is 2, written as: By Extended Euclidean Algorithm, the modular inverse can be computed as follows:

5 = 3(1)+ 2 3 = 2(1)+ 1 2 = 1(2)+ 0

The gcd(3, 5) is 1 since it is directly above the 0 remainder. Now, express 1 as a linear combination of 3 and 5.

1 = 3(1) - 2(1)

= 3(1) - [5(1) - 3(1)](1) = 3(1) - 5(1) +3(1) 1 = 3(2) - 5(1) Rewrite the gcd in the form: = +

![](img_p55_1.png)

| Since in the example, | = 3, and | = 5, then the linear combination becomes: 1 = 3(2) + 5(-1) |
|---|---|---|
| Therefore: 3-1 ≡ 2( | 5) |  |
| Solving Linear Congruences using Modular Inverse (for | (, | ) = ) Once the modular inverse of the coefficient is known, it can be used to solve linear |

congruences of the form ≡ ( ) by multiplying both sides of the congruence by the modular inverse of .

-----

*Example: Solve the congruence 17 ≡ 5(* 43) Step 1: Find the inverse of 17( 43) By Euclidean Algorithm (EA):

43 = 17(2) + 9 17 = 9(1) + 8 9 = 8(1) + 1 8 = 1(8) + 0

By Extended Euclidean Algorithm (EEA):

1 = 9(1) -8(1)

= 9(1) -[17(1) -9(1)](1) = 9(1) -17(1)+ 9(1) = 9(2) -17(1) = [43(1) - 17(2)](2) - 17(1) = 43(2) -17(4) -17(1) 1 = 43(2) -17(5) 1 = 17(-5)+ 43(2) 17(-5) ≡ 1( 43) Therefore, - ≡ -( ) To solve the congruence 17 ≡ 5( 43), ultiply both sides of the congruence by the modular inverse using the multiplication property:

17 ≡ 5( 43)

- (17) ≡ -(5)( 43)

≡ -25( 43) ≡ 18( 43) Therefore, the solution to the congruence is:

≡ 18( 43) To verify:

17(18) ≡ 306( 43) 17(18) ≡ 5( 43) Solving Linear Congruences using Reduction Method (for (, ) and

|)

| To solve | ≡ ( | ) | using reduction: |
|---|---|---|---|
| Check if gcd(, | ) = | > 1 | and \| Reduce the congruence by dividing the coefficient, constant term, and modulus by |

the gcd. Solve the reduced congruence. Determine all incongruent solutions using the form = 0 + ( ) where, 0 is a solution of the reduced congruence and = 0,1 … - 1. *Example: Solve 6 ≡ 8(* 14) Step 1: Check existence of solution: gcd(6,14) = 2 and 2|8 Therefore, 2 incongruent solutions modulo 14 exist. Step 2: Reduce the congruence by dividing by the gcd.

| 6 ≡ 8( | 6 ≡ 8( | 14) |  |  |
|---|---|---|---|---|
| 6 | ≡ 8 ( | 14 ) |  |  |
| 2 | 2 | 2 |  |  |
| 3 | ≡ 4( | 7) → | Reduced congruence |  |
| Step 3: Solve the reduced congruence. |  |  |  |  |
|  |  | By EA: | 7 = 3(2) +1 |  |
|  |  |  | 3 = 1(3) + 0 |  |
|  |  | By EEA: | 1 = 7(1) | -3(2) |
| Rewrite in the form 1 = + 1 = 3(-2)+ 7(1) |  |  |  |  |
| : |  |  |  |  |
|  |  | Modular Inverse: | 3-1 ≡ -2( | 7) |
|  |  | Reduce to least positive | 3-1 ≡ 5( | 7) |
|  |  | residue: |  |  |

*Multiply reduced congruence*

-----

|  | by modular inverse: 3-1(3) ≡ (5)(4)( 7) ≡ 20( 7) ≡ 6( 7) Step 4: Determine all incongruent solutions. Since there are two incongruent solutions ( = 2), then use = 0,1 = 0: = 6 +7(0) = 6 = 1: = 6 + 7(1) = 13 Final Answer: ≡ , ( ) Note: Keep the modulus of the original congruence in the final answer. Starting from the reduced solution, keep adding the reduced modulus until the required number of solutions is obtained. |
|---|---|
| Other Resources: | Borne, Andrew. 2020. "Solving Linear Congruences, Modular Arithmetic." YouTube video. https://www.youtube.com/watch?v=ViqgSWoSxN8. Penn, Michael. 2019. "Number Theory \| Linear Congruence Example 2." YouTube video. https://www.youtube.com/watch?v=HEAokut4F4I. RH. 2014. "Modular Inverse Made Easy." YouTube video, August 25, 2014. https://www.youtube.com/watch?v=mgvA3z-vOz. |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Part 1. Guided Practice For each congruence, find gcd(a, m), decide whether a solution exists, and state how many. 1. 6x ≡ 4 (mod 8) 2. 9x ≡ 2 (mod 6) 3. 10x ≡ 15 (mod 25) Part 2. Independent Practice Each has gcd 1. Find the inverse of a, then solve. 1. 3x ≡ 5 (mod 7) 2. 5x ≡ 4 (mod 11) 3. Use the extended Euclidean algorithm to find the inverse of 5 modulo 26, then solve 5x ≡ 3 (mod 26). Part 3. Independent Practice 1. Each has a gcd greater than 1 that divides b. Reduce, solve, and list all solutions modulo m. 2. 6x ≡ 18 (mod 24) 3. 10x ≡ 15 (mod 25) |
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. How did the gcd tell you whether to use the inverse or reduction? 2. How did you verify a solution after solving? 3. How did the gcd predict the number of solutions you found? |
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Part I. Multiple Choice Choose the letter of the correct answer. 1. Solve 3x ≡ 4 (mod 5) for x in {1, 2, 3, 4}. A. x = 1. B. x = 2. C. x = 3. D. x = 4 2. Which statement about 8x ≡ 6 (mod 14) is true? A. no solution, since 8 and 14 are not relatively prime B. exactly one solution, since 6 is even C. infinitely many solutions, since 14 is composite D. it has solutions, since gcd(8, 14) = 2 divides 6 |

-----

3. How many incongruent solutions does 6x ≡ 9 (mod 15) have? A. 0. B. 1 C. 3. D. 15
4. The inverse of 3 modulo 7 is: A. 2 B. 3 C. 4 D. 5
5. Solve 4x ≡ 3 (mod 5).
A. x ≡ 1 (mod 5)
B. x ≡ 2 (mod 5)
C. x ≡ 3 (mod 5)
D. x ≡ 4 (mod 5)
6. Reducing 4x ≡ 8 (mod 12) by its gcd gives:
A. x ≡ 2 (mod 3)
B. x ≡ 2 (mod 12)
C. x ≡ 4 (mod 6)
D. x ≡ 8 (mod 12)

Part II. Constructed Response

1. Solve 5x ≡ 4 (mod 9) using the modular inverse method. Show the inverse and the solution.
2. For 9x ≡ 12 (mod 15), decide whether solutions exist, state how many, and find them by reduction.
3. Use the extended Euclidean algorithm to find the inverse of 5 modulo 18, then solve 5x ≡ 4 (mod 18). Show the back-substitution.

|  | Part III. True or False with Reasoning 1. ax ≡ b (mod m) has a solution whenever gcd (a, m) divides b. Decide and give a reason. 2. If gcd (a, m) = 1, then ax ≡ b (mod m) has exactly one solution modulo m. Decide and give a reason. 3. A linear congruence always has exactly one solution. Decide and give a reason. 4. The inverse of a modulo m exists for every a. Decide and give a reason. 5. If gcd(a, m) does not divide b, the congruence still has solutions by reduction. Decide and give a reason. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the most important condition to check before solving a linear congruence? Why? 2. How does reducing congruence by its greatest common divisor simplify the problem? 3. How can linear congruences and modular inverses be applied in areas such as cryptography, coding systems, and computer security? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper Calculator |
| III. | Instructions: | For Remediation: For each congruence, check the gcd, decide whether a solution exists, and solve |

when it does.

1. 3x ≡ 6 (mod 9)
2. 2x ≡ 3 (mod 4)

*For Enhancement:* A student needs exactly 2 ounces using a 13-ounce beaker and a 20-ounce beaker, filling, pouring, and emptying as needed. Model the number of 13-ounce fills as a linear congruence modulo 20, then solve and interpret.

1. Write the linear congruence for the number of 13-ounce fills.
2. Decide whether a solution exists, using the gcd test.
3. Solve for the least positive number of fills. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question
1. Why does this pouring problem reduce to a linear congruence?

-----

|  | 2. How does the gcd tell you the goal of 2 ounces is reachable? |
|---|---|
| Lesson No. & Title: | Lesson 3.7. Applications of Modular Arithmetic in Real-World Verification Systems |
| Objectives: | At the end of the lesson, the students should be able to: 1. examine the structure of UPC-A codes and identify the role of the check digit; 2. verify a given UPC-A code using modular arithmetic and compute the check digit of a partial UPC-A code; 3. examine the structure of ISBN-10 codes; verify a given ISBN-10 and compute its check digit using arithmetic modulo 11; 4. examine the structure of ISBN-13 codes; verify a given ISBN-13 and compute its check digit using arithmetic modulo 10; 5. compare the ISBN-10 and ISBN-13 schemes in terms of weighting and modulus; 6. examine Luhn's algorithm and use it to verify credit card numbers; 7. apply Luhn's algorithm to detect single-digit errors and adjacent transpositions in identification numbers; and 8. connect modular arithmetic to error detection in real-world identification systems and explain why specific moduli and weights are chosen. |
| Key Ideas: | Verification System: A verification system uses numerical rules to check whether a code is valid. It uses modular arithmetic through weighted sums, remainders, and check digits to detect possible errors in codes. Error Detection: Error detection refers to identifying possible mistakes in a code, such as mistyped digits, missing digits, incorrect check digits, or adjacent digit transpositions. UPC-A Verification: A UPC-A code is a 12-digit barcode commonly used on retail products. To verify the check digit, multiply the first 11 digits by alternating weights of 3 and 1, compute the weighted sum, apply modulo 10, and compare the expected check digit with the actual 12th digit. If they match, the code is valid. If they do not match, the code is invalid. |

![](img_p59_1.png)

**ISBN-10 Verification: ISBN-10 is a 10-digit book identification system. To verify the**

check digit, multiply the first nine digits by decreasing weights from 10 to 2, compute the weighted sum, apply modulo 11, and compare the expected check digit with the actual 10th digit. If the expected check digit is 10, it is written as .

![](img_p59_2.png)

-----

|  | ISBN-13 Verification: ISBN-13 is a 13-digit book identification system. To verify the check digit, multiply the first 12 digits by alternating weights of 1 and 3, compute the weighted sum, apply modulo 10, and compare the expected check digit with the actual 13th digit. If they match, the code is valid. If they do not match, the code is invalid. Luhn Algorithm: The Luhn Algorithm is used for credit card numbers and other identification codes. To verify a code, double every second digit from the right, adjust products greater than 9 by subtracting 9 or adding the digits, add all resulting digits, and check whether the Luhn sum is divisible by 10. If 10 = 0, the code is valid. Otherwise, the code is invalid. |
|---|---|
| Examples and Illustrations: | I. UPC-A Example: Verify whether the UPC-A code: 7 25272 73070 6 is valid or invalid. Since the computed check digit matches the actual check digit, then the code is valid. II. ISBN-10 Example: Verify whether the ISBN-10 code: 0-431-40311-0 is valid or invalid. Since the expected check digit did not match the actual checked digit, then the code is invalid. III. ISBN-13 Example: Verify whether the ISBN-13 code: 978-0-431-40311-3 is valid or invalid. |

![](img_p60_4.png)

![](img_p60_1.png)

![](img_p60_2.png)

![](img_p60_3.png)

-----

![](img_p61_1.png)

|  | Since the computed check digit matches the actual checked digit, then the code is valid. IV. Luhn Algorithm Example: Verify whether credit card number 4512 2678 9012 3458 is valid or invalid using Luhn algorithm. Since the result is not 0, the code is invalid. Example: Assuming that the identification digits are correct, the expected check digit can be determined using the Luhn Algorithm. |
|---|---|
| Other Resources: | Modular Arithmetic \| Brilliant Math & Science Wiki. (n.d.). https://brilliant.org/wiki/modular-arithmetic/ Us, G. (2026, April 30). Barcode types. https://www.gs1us.org/upcs-barcodes-prefixes/barcode-types?utm_source Murtagh, J. (2025, November 11). What is the LuHN algorithm? the math behind credit card transactions. Scientific American. https://www.scientificamerican.com/article/what-is-the-luhn-algorithm-the-math- behind-secure-credit-card-numbers/ Zach's Math Zone. (2025). The LUHN algorithm for verifying credit card numbers [Video]. YouTube. https://www.youtube.com/watch?v=61mgSpvrqkc Zach's Math Zone. (2025). How to determine ISBN-10 Check digit [Video]. YouTube. https://www.youtube.com/watch?v=jnqqpCCUJRE Mathunlocked. (2024). Modular Arithmetic: basic and beyond [Video]. YouTube. https://www.youtube.com/watch?v=NFg6cw7vMuU |

![](img_p61_2.png)

![](img_p61_3.png)

-----

| I. Activity No. 1 | Practicing Learned Skills |
|---|---|
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Part 1. Guided Practice, UPC-A Verify the first code, then find the missing check digit of the second. Is 0 36000 29145 2 valid? Find the check digit: 0 12345 67890 ? Part 2. Independent Practice, ISBN-10 Use weights 10 down to 1 and modulo 11. Is 0-306-40615-2 valid? Find the check character: 0-201-53082-? Part 3. Independent Practice, ISBN-13 Use weights 1 and 3 and modulo 10. Find the check digit: 978-0-13-468599-? Part 4. Independent Practice, Luhn Double every second digit from the right, then check modulo 10. Is 1784 Luhn-valid? Find the check digit: 1 2 3 4 5 ? |
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. Which step did you find easiest to slip on, the weighting or the modulo? 2. How did you handle the (10 - remainder) step when the remainder was 0? 3. How did you check your answer once you found a check digit |
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | Part I. Multiple Choice Choose the letter of the correct answer. 1. The check digit of the UPC-A code 0 12345 67890? is: A. 0. B. 3. C. 5. D. 7 2. An ISBN-10 whose first nine digits give a weighted sum of 1 modulo 11 needs check character: A. 0. B. 1. C. X. D. 9 3. The check digit of the ISBN-13 code 978-0-13-468599-? is: A. 1. B. 3. C. 7. D. 9 4. The Luhn total for 1784 is 20. The number is: A. valid, because 20 is even B. valid, because 20 is 0 modulo 10 C. invalid, because 20 is not 10 D. invalid, because 1784 is even 5. Why does Luhn catch most adjacent transpositions? A. every digit is doubled B. adjacent positions are weighted differently, one doubled and one not C. the number becomes longer D. 10 is an even number 6. A 5-digit code 4852X is valid when 3(4) + 4(8) + 3(5) + 4(2) + X is 0 modulo 9. X is: A. 5. B. 4. C. 0. D. 2 Part II. Constructed Response |

-----

1. Test whether the ISBN-13 code 978-0-306-40615-7 is valid. Then explain how the check would respond to a single mistyped digit.
2. Find the missing UPC-A check digit for 5 90123 45678 ? and verify your answer.

Part III. True or False with Reasoning

1. A check digit carries information about the product itself. Decide and give a reason.
2. ISBN-10 uses modulo 11, which is why its check character can be X. Decide and give a reason.
3. A single mistyped digit always passes the check unnoticed. Decide and give a reason.
4. Luhn doubles every second digit counting from the right. Decide and give a reason.
5. ISBN-13 and UPC-A both reduce modulo 10. Decide and give a reason. **IV. Reflection:** Reflect on the key ideas discussed and answer each question accordingly.
1. What did you learn about the practical applications of modular arithmetic from studying check-digit systems?
2. How can understanding check-digit algorithms help you evaluate the reliability of identification and verification systems?
3. Where else in everyday life might error-detection techniques similar to check digits be useful?

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper calculator |
| III. | Instructions: | For Remediation Work the steps slowly on small codes. |

1. Find the UPC-A check digit for 0 11110 00000 ?
2. Verify whether the ISBN-10 code 0-306-40615-2 is valid.

*For Enhancement* Design a valid ISBN-10 code. Create your own book code and compute its check character with the ISBN-10 rule. Show the weighted sum, the modulo step, and the final check character.

1. Choose any nine digits for the body of the code.
2. Compute the weighted sum with weights 10 down to 2.
3. Find the check character that makes the total 0 modulo 11, using X for 10. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question
1. Why is the check computed from the first nine digits only?
2. Why does modulo 11 catch a swapped pair that modulo 10 might miss?

##### Unit No. & Title: Unit 4. Networks and Graphs Name: Grade & Section:

##### Lesson No. & Title: Lesson 4.1. Fundamental Concepts of Graph Theory

**Objectives:** By the end of the activities, you are expected to:

1. examine maps, road networks, and relational diagrams to identify recurring elements (points and connections);
2. define a graph as an ordered pair G = (V, E) consisting of a set of vertices V and a set of edges E;
3. identify and label vertices, edges, vertex degrees, and adjacency in given graphs;
4. differentiate types of graphs through examples: simple, directed, complete, bipartite, connected, path, cycle, tree, regular;
5. construct graph representations of real-world situations (transportation networks, social networks, communication networks); and
6. explain how graphs are used to model and analyze real-life situations.

-----

| Key Ideas: | Graph Definition: A mathematical structure used to model pairwise relations between objects. It is defined as G = (V, E) where G is the name of the graph, V is a set of vertices (points) and E is a set of edges (connections). Adjacency and Degree: Two vertices are adjacent if they are connected by an edge. The degree of a vertex is the number of edges incident to it. Common Graph Types: • Simple Graph: No loops or multiple edges between the same two vertices. • Directed Graph (Digraph): Edges have a specific direction (arrows). • Complete Graph: Every pair of distinct vertices is connected by a unique edge. • Bipartite Graph: Vertices can be divided into two sets such that no two vertices within the same set are adjacent. Mixed Graph: A realistic network that contains both undirected edges (mutual) and directed arcs (one-way) at the same time. |
|---|---|
| Examples and Illustrations | Look at the diagram below and write its formal identity. Final Form: G = ( ________________, _________________ ) V = { _________________________________ } E = { _________________________________ } Degree of Vertex A: _____ Degree of Vertex B: _____ Degree of Vertex C: _____ Degree of Vertex D: _____ Degree of Vertex E: _____ List all vertices adjacent to A:______ List all vertices adjacent to B:______ List all vertices adjacent to C:______ List all vertices adjacent to D:______ List all vertices adjacent to E:______ Answers: G = ({A, B, C, D, E}, {(A,B), (A,C), (B,C), (C,E), (E→D), (B→D)}) E = {(A,B), (A,C), (B,C), (C,E), (E→D), (B→D)} V = {A, B, C, D, E}. Degree of A: 2 \| Adjacent to A: {B, C} Degree of B: 3 \| Adjacent to B: {A, C, D} Degree of C: 3 \| Adjacent to C: {A, B, E} Degree of D: 2 \| Adjacent to D: {B, E} Degree of E: 2 \| Adjacent to E: {C, D} Identify the graph type for these scenarios: Scenario 1: A group of 4 students where everyone is friends with everyone else. (Type: ________________) Scenario 2: A network of one-way streets in a city. (Type: ________________) Scenario 3: A game of "Boys vs. Girls" where you can only pass the ball to a member of the opposite gender. (Type: ________________) Scenario 4: A street map where some roads are two-way and some are one-way. (Type: __________) Answers: |

![](img_p64_1.png)

-----

|  | Scenario 1 (Everyone friends with everyone): Complete Graph Scenario 2 (One-way streets): Directed Graph Scenario 3 (Passing only to opposite gender): Bipartite Graph Scenario 4 (Two-way and one-way roads): Mixed Graph |
|---|---|
|  | https://www.youtube.com/watch?v=Aj55yJ9Gz8Y https://www.youtube.com/watch?v=dxhFQyivdUs |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and markers Whiteboard The "AirLink Philippines" dataset. |
| III Instructions: | Use the five-step reading procedure from B.2. Part I is guided. Work it with the class. Part II is on your own. Figure 1. Practice graphs for guided work Part I. Guided Practice Items 1 to 3 use Graph 1. Items 4 and 5 use Graph 2. 1. For Graph 1, write the vertex set V and the edge set E. 2. For Graph 1, give the degree of each vertex. Check your list with the degree-sum relationship. 3. For Graph 1, which vertices are adjacent to C? Is the graph connected? 4. For Graph 2, write the arc set. Give the in-degree and the out-degree of W. 5. Is Graph 2 directed, undirected, or mixed? How can you tell? Part II. Independent Practice 6. AirLink serves five towns: Manila (M), Cebu (C), Davao (D), Basco (B), and Puerto Princesa (P). There is a two-way flight between M and C. There is a two-way flight between C and D. There is a one-way flight from D to M. There is a one-way flight from M to B. Puerto Princesa has no AirLink flight yet. a. Write the graph using edge and arc notation. b. Give the in-degree and out-degree of D. c. Is the graph connected? Is it directed, undirected, or mixed? 7 . Draw a simple graph with four vertices A, B, C, D whose degrees are A = 3, B = 1, C = 1, D = 1. Then write its edge set. 8. Name the most specific type for each description: a. Four vertices, every pair joined by exactly one edge. b. Six vertices in one closed loop, each joined to exactly two others. c. Seven water tanks joined by six pipes, connected, with no closed loop, one tank joined to three others. |

![](img_p65_1.png)

-----

d. Two teams, with games only between a player of one team and a player of the

other. **IV Reflection:** Answer each question to demonstrate your understanding of the lesson.

1. Across items 1 to 8, what is the quickest reliable check that you listed every connection and no extra one?
2. When does a graph need an in-degree and an out-degree instead of a single degree?
3. In item 6, why is the network not connected even though four of the five towns are linked?

|  |  |
|---|---|
| I. Activity No. 2 | Assessing Learning Outcomes |
| II. Materials Needed: | Ballpen or pencil Scratch paper (optional for degree counting and route tracing) Ruler (optional for neat graph tracing) Calculator (optional, if allowed by the teacher) |
| III. Instructions: | Part I. Multiple Choice Choose the best answer. Each item is worth 1 point. 1. In the notation G = (V, E), the set V is the set of: A. edges B. arcs C. vertices D. regions 2. A graph has edge set E = {AB, AC, AD, BC}. The degree of vertex A is: A. 1. B. 2. C. 3. D. 4 3. Using the same graph, E = {AB, AC, AD, BC}, the vertices adjacent to C are: A. A only B. A and B C. B and D D. A, B, and D 4. A simple graph on four vertices has every pair of vertices joined by exactly one edge. It is a: A. path B. cycle C. tree D. complete graph 5. Every edge of a graph joins a vertex in group X to a vertex in group Y, and no edge joins two vertices in the same group. The graph is: A. bipartite B. complete C. regular D. cycle 6. A network uses two-way roads and one-way streets together. As a graph it is best called: A. simple B. mixed C. complete D. regular 7. In a directed graph, the number of arcs pointing into a vertex is its: A. out-degree B. in-degree C. total degree D. order |

Part II. Constructed Response Show your work. Item 1 is worth 4 points. Item 2 is worth 3 points.

1. A graph G has vertices J, K, L, M with degrees J = 3, K = 3, L = 2, M = 2. (a) Find the edge set E. (b) Verify your answer using the degree-sum relationship.

-----

|  | 2. Three barangay offices are S, B, and M. A two-way footpath joins S and B. A one- way service road runs from B to M only. (a) Write the graph in edge and arc notation. (b) State whether the graph is undirected, directed, or mixed. (c) Give the out-degree of B. Part III. True or False Write T or F, then give a one-sentence reason. Each item is worth 2 points: 1 for the choice and 1 for the reason. 1. In a complete graph on n vertices, every vertex has degree n minus 1. 2. The sum of all vertex degrees in a graph equals the number of edges. 3. A cycle on six vertices has exactly six edges. 4. A tree with seven vertices has seven edges. 5. A graph on five vertices in which one vertex has no connection at all is disconnected. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the most important concept about graphs that you learned from today's activities? 2. How can graph theory help solve problems involving networks, transportation systems, or communication systems? 3. How are graph concepts such as degree, adjacency, and connectivity related to one another? |
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | For Enhancement A logistics company moves cargo between Manila (M), Tokyo (T), Shanghai (S), Seoul (K), and New York (N). The one-way flights are M→T, M→S, T→N, S→K, and K→N. There are also two-way ground lanes between M and K, and between T and S. Study Figure 1. Figure 1. Global logistics routes 1. Write the whole graph in using edge notation and arc notation. 2. A typhoon closes Tokyo, so every connection at T is unavailable. Find a route that still carries cargo from Manila to New York. Write it as a path of arcs and edges. 3. Counting hops, is your route the shortest detour? If a shorter one exists, give it. For Remediation Work with three friends: Yna (Y), Alex (A), and Bea (B). This activity rebuilds the difference between a two-way edge and a one-way arc. 1. Yna is friends with Alex, and Yna is friends with Bea. Draw this as an undirected graph and give the degree of each person. 2. Now read the same trio as follows on social media, a one-way relation: Yna follows Alex, Yna follows Bea, and Alex follows Bea. Draw this as a directed graph and give each out-degree. 3. Who has out-degree 0 in the directed version, and what does that mean in plain words? |

![](img_p67_1.png)

-----

**IV. Reflection:** Using what you have learned from the lesson, provide answers to each question

*For Enhancement:* Why might a real airline still prefer the longer all-flight route over the shorter ground-lane route?

*For Remediation:* In the one-way version, which way does each arrow point, and how is that different from a two-way friendship?

| Lesson No. & Title: | Lesson 4.2. Eulerian Path and Circuit |
|---|---|
| Objectives: | At the end of the lesson, you are expected to: 1. examine the Königsberg bridge problem to motivate Eulerian path and circuit concepts; 2. define an Eulerian path as a path that uses every edge of a graph exactly once; 3. define an Eulerian circuit as an Eulerian path that returns to its starting vertex; 4. examine connected graphs with various vertex-degree configurations and identify the pattern in Euler's theorem; 5. state Euler's Theorem: a connected graph has an Eulerian circuit if and only if every vertex has even degree; an Eulerian path that is not a circuit exists if and only if exactly two vertices have odd degree; 6. apply Euler's Theorem to determine the existence of Eulerian paths and circuits in given connected graphs; and 7. identify and trace Eulerian paths and circuits in connected graphs (e.g., using Fleury's procedure for guidance). |
| Key Ideas: | Euler Path is a trail in a graph that traverses every edge exactly once. It does not require the starting vertex and ending vertex to be the same. |
|  |  |

*Eulerian Circuit is a closed trail in a graph that traverses every edge exactly once and* begins and ends at the same vertex.

*Euler's Path and Circuit Theorem* A connected graph has an Euler Path if and only if it has exactly zero or two vertices of odd degree. A connected graph has an Euler Circuit if and only if every vertex has an even degree.

##### Eulerian Paths and Circuits in Fleury's Procedure

To identify and trace Eulerian paths or circuits in a connected graph, one may use Fleury's Procedure. This method involves:

1. Start at any vertex if finding an Euler circuit. (If finding an Euler path, start at one of the two vertices with odd degree.)
2. Choose any edge leaving the current vertex, provided deleting that edge will not separate the graph into two disconnected sets of edges.
3. Add that edge to the circuit, and delete it from the graph.
4. Continue until the circuit is complete.

**Examples and** Example 1. Draw a sketch of an Eulerian Path. Give one possible route.

##### Illustrations

![](img_p68_1.png)

*Route: B → A → E → B → C → D → E*

-----

Example 2. Draw a sketch of an Eulerian Path. Give one possible route.

![](img_p69_2.png)

*Route: A → E → D → F → E → B → F → C*

Example 3. Draw a sketch of an Eulerian Circuit. Give one possible route.

![](img_p69_3.png)

Route: A → D → G → E → B → C → G → E → A

Example 4. Draw a sketch of an Eulerian Circuit. Give one possible route.

![](img_p69_4.png)

Route: E→B→C→G→E→F→G→I→H→F→D→A→E

Example 5. Examine each given graph carefully and determine whether it contains any of the following: Eulerian Path Eulerian Circuit Neither

![](img_p69_1.png)

##### 1. Eulerian Path Test

##### Degree of Vertices:

Vertex A = 3 (odd) Vertex B = 3 (odd) Vertex C = 3 (odd) Vertex D = 3 (odd)

-----

|  | Vertex E = 3 (odd) Vertex F = 3 (odd) Decision: No Eulerian Path Exists Reason: A graph has an Eulerian Path if and only if it has exactly 0 or 2 vertices of odd degree. In this graph, all six vertices (A, B, C, D, E, F) have odd degrees, resulting in a total of 6 odd-degree vertices. Since the number of odd-degree vertices is greater than 2, the necessary condition for the existence of an Eulerian Path is not satisfied. Therefore, it is impossible to construct a path that uses every edge exactly once. Possible Route: None - A valid Eulerian Path cannot be formed because the graph violates the required condition on vertex degrees. 2. Eulerian Circuit Test Degree of Vertices: Vertex A = 3 (odd) Vertex B = 3 (odd) Vertex C = 3 (odd) Vertex D = 3 (odd) Vertex E = 3 (odd) Vertex F = 3 (odd) Decision: No Eulerian Circuit Exists Reason: A graph has an Eulerian Circuit if and only if all vertices have even degrees. In this graph, all vertices (A, B, C, D, E, F) have odd degrees, which directly violates the condition required for an Eulerian Circuit. Since even a single odd-degree vertex prevents the existence of an Eulerian Circuit-and in this case, all vertices are odd-it is impossible to construct a closed route that uses every edge exactly once and returns to the starting point. |
|---|---|
| Other Resources: | https://jeremymartinmath.github.io/courses/math105-F11/Lectures/chapter5- part2.pdf https://arxiv.org/pdf/2308.04512 https://www.youtube.com/watch?v=5M-m62qTR-s&t=138s |
| I. Activity No. 1 | Practicing Learned Skills |
| II. Materials Needed: | pen and paper |
| III. Instructions: | For each graph in Figure 1, count the odd-degree vertices, then classify the graph as having an Euler circuit, an Euler path that is not a circuit, or neither. Trace one valid route where the theorem says one exists. Figure 9. Three graphs to classify Part I. Guided Practice 1. Graph 1. Count the degree of each vertex. How many vertices have odd degree? Classify the graph, then trace a route that uses every edge exactly once and returns to the starting vertex. |

![](img_p70_1.png)

-----

2. Graph 2. Count the vertices with odd degree. Classify the graph. Name the two vertices where any full route must start and end, then trace one.

Part II. Independent Practice

3. Graph 3. Count the odd vertices and classify the graph. State why no full route exists.
4. Without drawing, decide: a connected graph has vertex degrees 2, 2, 2, 4, and 4. Does it have an Euler circuit, an Euler path that is not a circuit, or neither? Explain in one line.
5. Graph 3 has four odd vertices. Add exactly one edge between two of them so the graph then has an Euler path. Which edge did you add, and what are the new endpoints of the Eulerian path? **IV. Reflection:** Answer each question to demonstrate your understanding of the lesson.
1. What is the fastest single check that tells you which of the three cases a graph falls into?
2. Which graph was hardest to classify or trace, and what made it hard?
3. After you traced a route, how did you confirm it really used every edge exactly once?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Answer all three parts. Show your reasoning where asked. This check has 24 points. Part I. Multiple Choice |

Choose the best answer. Each item is worth 1 point.

1. An Euler path uses every \_\_\_\_ of a connected graph exactly once.
A. vertex
B. edge
C. region
D. label
2. An Euler circuit differs from an Euler path because it:
A. returns to its starting vertex
B. skips some edges
C. visits every vertex exactly once
D. uses some edges twice
3. A connected graph has an Euler circuit when:
A. every vertex has even degree
B. exactly two vertices are odd
C. it has no cycles
D. every vertex has odd degree
4. A connected graph has an Euler path that is not a circuit when:
A. all vertices are even
B. exactly two vertices have odd degree
C. four vertices are odd
D. it is complete
5. A connected graph has neither an Euler path nor an Euler circuit when:
A. exactly two vertices are odd
B. all vertices are even
C. more than two vertices are odd
D. it contains a cycle
6. A connected graph has vertex degrees 2, 2, 4, 4. The graph has:
A. a Hamiltonian path
B. an Euler path but not a circuit
C. an Euler circuit
D. neither
7. A connected graph has vertex degrees 2, 3, 3, 4. The graph has: A. an Euler path that is not a circuit

-----

|  | B. an Euler circuit C. neither D. an Euler circuit because the total degree is even Part II. Constructed Response Show your work. Item 1 is worth 4 points. Item 2 is worth 3 points. 1. A connected graph has vertices P, Q, R, S, T with degrees P = 2, Q = 4, R = 2, S = 3, T = 3. (a) State how many vertices are odd. (b) Classify the graph as having an Euler circuit, an Euler path that is not a circuit, or neither. (c) If a route exists, name the vertices where it must start and end. 2. A maintenance crew must walk along every corridor of a building exactly once to check the lights. In the building's graph, exactly two rooms have odd degree: the lobby and the roof door. (a) Can the crew walk every corridor exactly once? (b) Where must they start and finish? (c) Can they return to where they started? Explain in one line. Part III. True or False 1. Write T or F, then give a one-sentence reason. Each item is worth 2 points: 1 for the choice and 1 for the reason. 2. An Euler path may pass through the same vertex more than once. 3. A connected graph with exactly one odd-degree vertex can still have an Euler path. 4. If every vertex of a connected graph has even degree, the graph has an Euler circuit. 5. A connected graph with four odd-degree vertices has an Euler path. 6. The seven bridges of Königsberg can be walked so that each bridge is crossed exactly once. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the first thing you should check when determining whether a graph has an Euler path or circuit? 2. How can you use vertex degrees to classify a graph without drawing a route? 3. How can Euler paths and circuits help solve practical problems involving transportation, maintenance, or logistics? |
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | For Remediation: Fix the Route A classmate analyzed the graph in Figure 2 and wrote: "This is an Euler circuit. Start at A and you can return to A using every edge once." Check the claim and correct it if it is wrong. Figure 2. A route claim to check 1. Count the degree of each vertex A, B, C, D, and E. List the odd ones. 2. Is the classmate's claim correct? If not, give the correct classification. 3. Write one correct route that uses every edge exactly once, and name where it starts and ends. For Enhancement: |

![](img_p72_1.png)

-----

|  | Make It Eulerian The graph in Figure 3. has every vertex odd, so it has neither an Euler path nor an Euler circuit. You may add edges, including a second edge between two vertices that are already joined, to repair it. Figure 3. A graph to make Eulerian 1. Add the fewest edges needed so the graph has an Euler path. Which edge or edges did you add, and what are the new endpoints? 2. Now add edges so that the graph has an Euler circuit. How many edges did you need to add? Explain why? |
|---|---|
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question For Remediation: Which two vertices are odd, and why does that make the classmate's Euler circuit impossible? For Enhancement: Each edge you add changes the degree of two vertices. How does that help you turn odd vertices into even ones? |
| Lesson No. & Title: | Lesson 4.3. Hamiltonian Path and Circuit |
| Objectives: | At the end of the lesson, you will able to: 1. examine route-planning scenarios where each location must be visited exactly once (e.g., delivery routes, tour planning) to motivate Hamiltonian concepts; 2. define a Hamiltonian path as a path that visits every vertex of a graph exactly once; 3. define a Hamiltonian circuit as a Hamiltonian path that returns to its starting vertex; 4. examine simple graphs of various structures and observe that no general if- and-only-if condition (analogous to Euler's theorem) is known for Hamiltonicity; 5. state Dirac's condition as a sufficient condition: if every vertex of a simple graph on n ≥ 3 vertices has degree at least n/2, then the graph contains a Hamiltonian circuit; 6. apply Dirac's condition to confirm the existence of Hamiltonian circuits in graphs that satisfy it; 7. identify and trace Hamiltonian paths and circuits in given connected graphs; and 8. differentiate Eulerian and Hamiltonian paths/circuits based on whether the focus is on edges or vertices, and identify which concept applies in given problem contexts. |
| Key Ideas: | A Hamiltonian path is a path in a graph that visits every vertex exactly once. A Hamiltonian circuit is a special type of Hamiltonian path that not only visits every vertex exactly once but also returns to the starting vertex, forming a complete loop. Dirac's Condition (Sufficient Condition for Hamiltonicity) A graph with ≥ 3 vertices if every vertex has degree at least , then the graph contains a Hamiltonian circuit. |

![](img_p73_1.png)

-----

This condition is sufficient but not necessary, meaning: If the condition is satisfied → a Hamiltonian circuit is guaranteed. If the condition is not satisfied → a Hamiltonian circuit may still exist.

**Examples and** *Example 1. Show if the graph shown below have a Hamiltonian path.*

![](img_p74_1.png)

##### Illustrations

Figure 1. Route: B → E → D → F → A → C *Example 2: Show if the graph shown below have a Hamiltonian circuit.*

![](img_p74_2.png)

Figure 2. Route: B → E → D → F → C → A → B *Example 3: Using Dirac's Condition, determine whether the given graphs shown below* *have a Hamiltonian circuit or not. If yes, give one possible route.*

![](img_p74_3.png)

Figure 3. Answer: n = 7

= 3.5 (~4)

2

| Degree | of Vertices: |  |
|---|---|---|
| A = 4 B = 4 | D = 4 E = 5 | G = 4 |
| C = 4 Reason: Each vertex has a degree at least 4, which is greater than or equal to . | F = 5 |  |

Decision: By Dirac's Condition, the graph is guaranteed to have a Hamiltonian Circuit. Possible Route: A → B → C → D → G → F → E → A

-----

![](img_p75_1.png)

Figure 4 Answer: n = 7

= 3.5 (~4)

2

| Degree | of Vertices: |  |
|---|---|---|
| A = 3 B = 3 | D = 3 E = 2 | G = 5 |
| C = 3 | F = 3 |  |

Reason: The graph does not satisfy Dirac's Condition because several vertices have degree less than . Therefore, the condition required by the theorem is not met.

2

Decision: Dirac's Theorem is not applicable. The existence of a Hamiltonian Circuit cannot be determined using the condition alone and must be verified by direct construction or other methods. That is,

![](img_p75_2.png)

Figure 5. Possible Route: Route: A → B → C → D → G → E → F → A

*Example 4: Carefully examine each given graph and determine whether it contains an* Eulerian path, Eulerian circuit, Hamiltonian path, Hamiltonian circuit, or none of these. Support your answer by providing a brief mathematical justification, such as analyzing vertex degrees for Eulerian cases or applying Dirac's Condition when applicable for Hamiltonian circuits. If a valid path or circuit exists, trace or list one possible route on the graph. Write your answers clearly and completely for each given graph.

![](img_p75_3.png)

Figure 6 *Answer:*

**Eulerian Path: No Eulerian Path exists. Reason: The graph does not satisfy the necessary condition for an Eulerian path**

because it has more than two vertices with an odd degree. Since an Eulerian path

-----

requires exactly zero or two vertices of odd degree, the graph cannot contain an Eulerian path.

**Eulerian Circuit: No Eulerian Circuit exists. Reason: The graph does not satisfy the condition for an Eulerian circuit because not**

all vertices have even degrees. The presence of vertices with odd degrees makes it impossible for the graph to form an Eulerian circuit.

**Hamiltonian Path: A Hamiltonian Path exists. Reason: There is a possible route in the graph that visits every vertex exactly once**

without repetition. This confirms the existence of a Hamiltonian path based on direct tracing of the vertices.

**Hamiltonian Circuit: A Hamiltonian Circuit exists. Reason: Although Dirac's Condition is not satisfied, the graph still contains a closed**

route that visits every vertex exactly once and returns to the starting vertex. This confirms the existence of a Hamiltonian circuit through inspection of the graph. Conclusion: The graph is Hamiltonian, as it contains both a Hamiltonian path and a Hamiltonian circuit, meaning all vertices can be visited exactly once and a complete cycle returning to the starting vertex is possible.

![](img_p76_1.png)

Figure 7

*Answer:*

**Eulerian Path: No Eulerian Path exists. Reason: The graph has four vertices with odd degree. Since an Eulerian path exists**

only when a graph has exactly zero or two vertices of odd degree, the condition is not satisfied.

**Eulerian Circuit: No Eulerian Circuit exists. Reason: Not all vertices have even degrees. Only some vertices meet the even-degree**

requirement, so the graph cannot form an Eulerian circuit.

**Hamiltonian Path: A Hamiltonian Path exists. Reason: There is a possible route in the graph that visits every vertex exactly once**

without repetition. This confirms the existence of a Hamiltonian path based on direct traversal of all vertices.

**Hamiltonian Circuit: A Hamiltonian Circuit exists. Reason: Although Dirac's Condition is not satisfied, the graph still contains a closed**

route that visits every vertex exactly once and returns to the starting vertex, forming a Hamiltonian circuit.

**Conclusion: The graph is Hamiltonian since it contains both a Hamiltonian path and**

a Hamiltonian circuit, allowing all vertices to be visited exactly once with a possible closed-loop route.

![](img_p76_2.png)

Figure 8.

-----

*Answer:*

##### Eulerian Path: Eulerian Path exists Reason: All vertices have even degrees; therefore, an Eulerian circuit exists, which is

also an Eulerian path.

##### Eulerian Circuit: Eulerian Circuit exists Reason: All vertices have even degrees, allowing a closed trail that uses every edge

exactly once.

##### Hamiltonian Path: Yes, a Hamiltonian Path exists Reason: All vertices are visited exactly once without repetition.

**Hamiltonian Circuit: Yes, a Hamiltonian Circuit exists Reason: All vertices are visited exactly once and the path returns to the starting**

vertex.

##### Conclusion:

The graph is both Eulerian and Hamiltonian (it contains both path and circuit). **Other Resources:** [https://web2.aabu.edu.jo/tool/course\_file/lec\_notes/901200\_Discrete14\_part1.pdf](https://web2.aabu.edu.jo/tool/course_file/lec_notes/901200_Discrete14_part1.pdf)

[https://www.bing.com/search?q=hamiltonian+paths+and+circuits+.pdf](https://www.bing.com/search?q=hamiltonian+paths+and+circuits+.pdf) [https://trotter.math.gatech.edu/math-3012/6-](https://trotter.math.gatech.edu/math-3012/6-Euler_Circuits_and_Hamiltonian_Cycles.pdf) [Euler\_Circuits\_and\_Hamiltonian\_Cycles.pdf](https://trotter.math.gatech.edu/math-3012/6-Euler_Circuits_and_Hamiltonian_Cycles.pdf) [https://www.youtube.com/watch?v=AamHZhAmR7o](https://www.youtube.com/watch?v=AamHZhAmR7o) [https://www.youtube.com/watch?v=OGh5JKso0y4](https://www.youtube.com/watch?v=OGh5JKso0y4) [https://www.youtube.com/watch?v=aOM1CsHMxKo](https://www.youtube.com/watch?v=aOM1CsHMxKo)

| I. | Activity No. 1 | Practicing Learned Skills |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | From Guided to Independent: Finding and Testing Routes Work the guided set first, then the independent set. The items are ordered by |

structure, not by surface difficulty.

Guided practice. Use Network P in the figure 9.

![](img_p77_1.png)

Figure 9. Network P for guided practice.

1. List the degree of each vertex in Network P.
2. Check Dirac's condition. State n, then n/2, then each degree, and decide whether a Hamiltonian circuit is guaranteed.
3. Find a Hamiltonian circuit. Write the sequence of vertices.

Independent practice. Use Network Q in Figure 10.

-----

![](img_p78_1.png)

Figure 10. Network Q for independent practice.

Instructions:

4. List the degree of each vertex in Network Q, then check Dirac's condition. State n, then n/2, and each degree.
5. Decide whether Dirac's condition guarantees a Hamiltonian circuit.
6. Whether or not Dirac applies, find a Hamiltonian circuit by inspection, or explain why none exists. **IV. Reflection:** Answer each question to demonstrate your understanding of the lesson.
1. Which step did you use first when Dirac's condition did not guarantee a circuit?
2. Which item used the same idea as the guided set inside a new structure?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Part I. Multiple Choice (Choose the best answer.) 1. A Hamiltonian path is best described as a route that |

A. uses every edge of a graph exactly once.
B. visits every vertex of a graph exactly once.
C. visits every vertex and returns to the start.
D. uses every edge and returns to the start.
2. A Hamiltonian circuit differs from a Hamiltonian path because it
A. may skip some vertices.
B. uses every edge exactly once.
C. returns to its starting vertex.
D. requires an odd number of vertices.
3. Dirac's condition applies to a simple graph with n vertices, n at least 3, and guarantees a Hamiltonian circuit when
A. the graph has an even number of edges.
B. every vertex has degree at least n/2.
C. exactly two vertices have odd degree.
D. the graph is a tree.
4. A graph has 6 vertices. By Dirac's condition, a Hamiltonian circuit is guaranteed if every vertex has degree at least A. 2 B. 3 C. 4 D. 6
5. Which task is a Hamiltonian problem rather than an Eulerian problem?
A. A mail carrier wants to walk every street exactly once.
B. A tour guide wants to visit every landmark exactly once.
C. A plow wants to clear every road exactly once.
D. An inspector wants to cross every bridge exactly once.
6. In a graph, vertex F connects to only one other vertex. A Hamiltonian circuit
A. must pass through F twice.
B. is impossible, because F has degree 1, and a Hamiltonian circuit needs two distinct edges at every vertex.
C. is still guaranteed by Dirac's condition.
D. exists only if F has degree 0.

Part II. Constructed Response (Show your work.)

-----

|  | 1. A graph G has vertices A, B, C, D, and E. Its edges are AB, BC, CD, DE, EA, and CE. (a) Give the degree of each vertex. (b) State whether Dirac's condition is satisfied, and show n/2. (c) Find one Hamiltonian circuit, or explain why none exists. 2. A delivery driver must start at the depot, visit five stops exactly once, and return to the depot. In two to three sentences, explain why this situation represents a Hamiltonian circuit problem and not an Eulerian one. Then identify one limitation of Dirac's Theorem in determining whether such routes exists. Part III. True or False with Reasoning Write True or False, then give a one-sentence reason. 1. Every graph that has a Hamiltonian path also has a Hamiltonian circuit. 2. If a connected graph has exactly two vertices of odd degree, then it contains an Eulerian path. 3. Dirac's condition is both necessary and sufficient for a Hamiltonian circuit. 4. A vertex of degree 1 can appear in a Hamiltonian circuit. 5. A Hamiltonian circuit on n vertices uses exactly n edges. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the key difference you should remember between Eulerian and Hamiltonian problems? 2. How can graph properties such as degree and connectivity help you analyze Hamiltonian routes? 3. How can Hamiltonian paths and circuits be applied to transportation, logistics, and route-optimization problems in everyday life? |
| I. Activity No. 3 | Extending and Reinforcing Learning |
| II. Materials Needed: | pen and paper calculator |
| III. Instructions: | For Remediation: Trace and Tell Use the network in Figure 11. Work each step and explain your reasoning. Figure 11. A simple network for remediation practice. 1. List the degree of each vertex. 2. Find a Hamiltonian path. Write the sequence of vertices. 3. Decide whether a Hamiltonian circuit exists, and explain. For Enhancement: Find the Best Loop Use the network in Figure 2. Work each step and justify your answer. Figure 12. A denser network for enhancement practice. 1. Confirm Dirac's condition. State n, then n/2, then each degree. 2. Find a Hamiltonian circuit. |

![](img_p79_1.png)

![](img_p79_2.png)

-----

3. Find a second, different Hamiltonian circuit, or argue why the outer loop is the simplest. **IV. Reflection:** Using what you have learned from the lesson, provide answers to each question *For Remediation:* Which vertex blocks a circuit, and why?

*For Enhancement:* Why does Dirac's condition guarantee a circuit here without any searching?

| Lesson No. & Title: | Lesson 4.4. Spanning Trees and Shortest Paths |
|---|---|
| Objectives: | At the end of the lesson, learners should be able to: 1. examine connected graphs containing multiple cycles to motivate the need for subgraphs that retain connectivity without redundancy. 2. define a tree as a connected acyclic graph; state basic properties (a tree on n vertices has n - 1 edges). 3. define a spanning tree of a connected graph and explain its significance in network design (minimal connectivity). 4. trace the Breadth-First Search (BFS) algorithm step by step on small graphs to identify a spanning tree. 5. apply BFS to find a spanning tree of a given connected graph. 6. trace the Depth-First Search (DFS) algorithm step by step on small graphs to identify a spanning tree. 7. apply DFS to find a spanning tree of a given connected graph. 8. compare BFS and DFS spanning trees on the same graph and explain differences in traversal order. |
| Key Ideas and Examples: | Trees, Spanning Trees, and Two Ways to Find Them A tree is a connected graph with no cycle. A short fact follows from that definition: a tree on n vertices has exactly n - 1 edges, no more and no fewer. A spanning tree of a connected graph is a subgraph that is a tree and that includes every vertex of the graph. Figure 1 shows one spanning tree of the sitio network. The green lines form a tree that reaches all six sitios using only five lines. |

![](img_p80_1.png)

**Figure 1. One spanning tree of a connected graph, shown in green over the full graph.**

**Why a spanning tree matters. A spanning tree is the smallest network that keeps**

every vertex connected. Remove any one of its edges and the network splits into two pieces. Add any other edge of the original graph and you form a cycle, which is the redundancy the barangay wanted to avoid in A.2. This is why network designers use spanning trees to connect locations at least cost. A useful analogy is a backbone: the spanning tree is the minimal backbone that ties every stop together, and every extra line is a convenience, not a necessity.

**Breadth-First Search. Two algorithms build a spanning tree by exploring the graph**

from a chosen start vertex, called the root. Throughout, when a vertex has more than one unvisited neighbor, visit those neighbors in alphabetical order. Breadth-First Search, or BFS, explores level by level using a queue. Put the root in the queue. Take

-----

the front vertex out, visit its unvisited neighbors in alphabetical order, and add them to the back of the queue. Repeat until the queue is empty. The edge that first reaches each vertex becomes a tree edge. Figure 2 shows BFS from A. The badges give the order the vertices are reached: A, then B and C, then D, E, and F.

![](img_p81_1.png)

**Figure 2. A BFS spanning tree from A, with badges showing the order vertices are**

*reached.*

##### Step-by-step BFS trace:

1. Start: visit A and place it in the queue. Queue: A.
2. Take A out. Its unvisited neighbors are B and C. Visit both and add edges AB and AC. Queue: B, C.
3. Take B out. Its only unvisited neighbor is D. Add edge BD. Queue: C, D.
4. Take C out. Its only unvisited neighbor is E. Add edge CE. Queue: D, E.
5. Take D out. Its only unvisited neighbor is F. Add edge DF. Queue: E, F.
6. Take E, then F. Neither has an unvisited neighbor. The queue empties and the tree AB, AC, BD, CE, DF is complete.

**Depth-First Search. Depth-First Search, or DFS, explores as deep as possible before**

backing up, using a stack that you can picture as the trail you can walk back along. From the current vertex, move to its first unvisited neighbor in alphabetical order, and keep going deeper. When a vertex has no unvisited neighbor, back up to the previous vertex and try its next neighbor. Figure 3 shows DFS from A. The order is A, B, C, E, D, F.

![](img_p81_2.png)

**Figure 3. A DFS spanning tree from A, with badges showing the order vertices are**

*reached.*

##### Step-by-step DFS trace:

1. Visit A, then go deeper to its first neighbor B. Add edge AB.
2. From B, go deeper to C. Add edge BC.

-----

|  | 3. From C, go deeper to E. Add edge CE. 4. From E, go deeper to D. Add edge DE. 5. From D, go deeper to F. Add edge DF. 6. F has no unvisited neighbor, so back up through D, E, C, B, and A. The tree AB, BC, CE, DE, DF is complete. Comparing the two. Both searches reach every vertex, so both produce a spanning tree with n - 1 edges. They can choose different edges. Figure 4 places the two trees side by side. BFS used AC and BD; DFS used BC and DE in their place. The trees differ because BFS spreads out level by level while DFS commits to one deep branch first. Figure 4. The BFS tree and the DFS tree of the same graph, side by side. |
|---|---|
| Other Resources: | @boraxalgo. "BFS Breadth First Search" YouTube Short, 0:19, January 18, 2023. https://www.youtube.com/shorts/umHJzlKFGlU. |
| I. Activity No. 1 | Practicing Learned Skills: Edge Break Challenge |
| II. Materials Needed: | pen and paper |
| III. Instructions: | Build a Spanning Tree Two Ways Use Network R in Figure 1 for both sets. Start every search at vertex A and visit neighbors in alphabetical order. Figure 9. Network R for building BFS and DFS spanning trees. Guided practice. Work on the following activities individually or with your classmates. 1. List the neighbors of each vertex in alphabetical order. 2. Perform a Breath-First Search (BFS) starting from vertex A. Write the order in which the vertices are visited, then list the edges that form the BFS spanning tree. Work this set on your own. 3. Run DFS from A. Write the order the vertices are reached, then list the DFS tree edges. |

![](img_p82_1.png)

![](img_p82_2.png)

-----

4. Compare the two trees and name one edge that is in the BFS tree but not the DFS tree. **IV. Reflection:** Answer each question to demonstrate your understanding of the lesson.
1. When you ran BFS, how did the queue decide which vertex to visit next?
2. Which edges did the BFS tree and the DFS tree disagree on, and why?

| I. | Activity No. 2 | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Answer all three parts. No graphs are drawn here; each network is given by its list of edges. |

Part I. Multiple Choice. Choose the best answer.

1. A tree on 9 vertices has how many edges? A. 8 B. 9 C. 10 D. 16
2. Which statement describes a tree?
A. A connected graph with no cycle
B. A connected graph with exactly one cycle
C. Any graph with no cycle
D. Any graph that has n - 1 edges
3. A spanning tree of a connected graph must
A. include every vertex and contain no cycle
B. include every edge of the graph
C. use every edge exactly once
D. contain a cycle through all vertices
4. In a BFS spanning tree from a root, each vertex is first reached
A. in order of its distance in edges from the root
B. by going as deep as possible first
C. in reverse alphabetical order
D. only after every other vertex
5. DFS from a root explores by
A. going as deep as possible, then backing up when stuck
B. finishing each level before starting the next
C. choosing the closest unvisited vertex anywhere in the graph
D. removing edges that form cycles first
6. For a connected graph that contains cycles, BFS and DFS from the same root
A. always give the same spanning tree
B. each give a spanning tree, and the two may use different edges
C. give a spanning tree only when the graph is already a tree
D. give trees with different numbers of edges

Part II. Constructed Response. Show your work. Visit neighbors in alphabetical order.

1. A network has vertices A, B, C, D, E with edges AB, AC, BD, CD, and CE. Run BFS from A. Give the visit order and list the BFS tree edges.
2. For the same network, run DFS from A. Give the visit order and list the DFS tree edges. Then name one edge in the BFS tree that is not in the DFS tree.

|  | Part III. True or False with Reasoning. State true or false and give one reason. 1. A tree can contain a cycle. 2. A spanning tree of a connected graph on 7 vertices has 6 edges. 3. Adding a non-tree edge of the graph to a spanning tree creates a cycle. 4. BFS and DFS from the same root always produce the same spanning tree. 5. A disconnected graph has a spanning tree. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly 1. When you ran BFS, how did the queue decide which vertex to visit next? 2. Which edges did the BFS tree and the DFS tree disagree on, and why? |

-----

| I. Activity No. 3 | Extending and Reinforcing Learning |
|---|---|
| II. Materials Needed: | Pen and Paper Calculator |
| III. Instructions: | For Remediation: One Search, Step by Step Use the network in Figure 10. Start at A and visit neighbors in alphabetical order. Run BFS only. Figure 10. A small network for remediation practice with BFS. 1. List the neighbors of each vertex in alphabetical order. 2. Run BFS from A and write the order the vertices are reached. 3. List the BFS tree edges and count them. For Enhancement: Compare the Two Searches Use the network in Figure 11. Start at A and visit neighbors in alphabetical order. Run both BFS and DFS. Figure 11. A denser network for enhancement practice with BFS and DFS. 1. Run BFS from A and list the BFS tree edges. 2. Run DFS from A and list the DFS tree edges. 3. Name every edge that is in one tree but not the other. |
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question For Remediation: How many edges does your tree have, and how does that compare with the number of vertices? For Enhancement: Which search produced a more spread-out tree, and which produced one long branch? |
| Lesson No. & Title: | Lesson 4.5 Djikstra's and Floyd-Warshall Algorithm |
| Objectives: | At the end of the lesson, you should be able to: 1. examine weighted graphs in real-world contexts (road networks, communication networks, logistics) to motivate shortest-path problems; 2. define a weighted graph and the length (or weight) of a path. 3. state the shortest-path problem in single-source and all-pairs forms. 4. trace Dijkstra's algorithm step by step on small weighted graphs with non- negative edge weights. |

![](img_p84_1.png)

![](img_p84_2.png)

-----

|  | 5. apply Dijkstra's algorithm to find shortest paths from a source vertex to all other vertices. 6. trace the Floyd-Warshall algorithm step by step on small weighted graphs. 7. apply the Floyd-Warshall algorithm to find shortest paths between all pairs of vertices. 8. compare Dijkstra's and Floyd-Warshall algorithms in terms of input requirements (single-source vs all-pairs), edge-weight conditions (non- negative vs general), and computational efficiency. |
|---|---|
| Key Ideas and Examples: | Two Algorithms for Shortest Paths A weighted graph has a number on each edge, its weight, which often stands for a distance, a time, or a cost. The length of a path is the sum of its edge weights. The shortest-path problem asks for the path of least total weight. It comes in two forms. The single-source form asks for the shortest path from one source vertex to every other vertex. The all-pairs form asks for the shortest path between every pair of vertices. |

Dijkstra's algorithm. Dijkstra's algorithm solves the single-source problem when no weight is negative. Give each vertex a tentative distance from the source, 0 for the source and infinity for the rest. Then repeat two steps. Finalize the unfinalized vertex with the smallest tentative distance. For each of its neighbors, check whether reaching that neighbor through the finalized vertex is shorter than the neighbor's current tentative distance, and if so, lower it. Stop when every vertex is finalized. Figure 5 shows a weighted graph with source A.

![](img_p85_1.png)

**Figure 1. A weighted graph for Dijkstra's algorithm, with source A. Step-by-step Dijkstra trace:**

1. Start: A = 0; B, C, D, E = infinity.
2. Finalize A. Update neighbors: B = 2, C = 5.
3. Finalize B, the smallest at 2. Update: C = min(5, 2 + 1) = 3; D = 2 + 7 = 9.
4. Finalize C at 3. Update: D = min(9, 3 + 3) = 6; E = 3 + 8 = 11.
5. Finalize D at 6. Update: E = min(11, 6 + 2) = 8.
6. Finalize E at 8. Every vertex is final. Figure 6 shows the result.

![](img_p85_2.png)

**Figure 2. Dijkstra result: the shortest distance from A to each vertex, with the**

shortest-path tree in green.

-----

Notice that the direct edge A to C has weight 5, but the shortest path from A to C is A to B to C with total 3. The shortest path is not the one with the fewest edges.

**Floyd-Warshall algorithm. The Floyd-Warshall algorithm solves the all-pairs**

problem and works even when some weights are negative, as long as there is no negative cycle. Write the weights in a distance matrix: 0 on the diagonal, the edge weight where an edge exists, and infinity where none does. Then, for each vertex k in turn, ask for every pair of vertices i and j whether going from i to j through k is shorter than the current entry, and if so, replace it. After every vertex has served as k, the matrix holds the shortest distance for every pair. This matrix records distances only. To recover the actual route between two vertices, keep a companion next-vertex table while you update the matrix, then follow that table from the start vertex to read off the path. Figure 7 shows a four-vertex weighted graph.

![](img_p86_1.png)

**Figure 3. A four-vertex weighted graph for the Floyd-Warshall algorithm.**

##### Step-by-step Floyd-Warshall trace:

1. Start with the initial matrix: 0 on the diagonal, the given weights, and infinity for missing edges.
2. Through A: B to D becomes 3 + 7 = 10.
3. Through B: A to C becomes 3 + 1 = 4.
4. Through C: A to D becomes 4 + 2 = 6; B to D becomes 1 + 2 = 3.
5. Through D: no entry improves. Figure 8 shows the start and final matrices.

![](img_p86_2.png)

**Figure 4. The initial matrix and the final all-pairs matrix from Floyd-Warshall. Comparing the two. The two algorithms answer different questions. Dijkstra finds**

the shortest paths from one source and needs non-negative weights. Floyd-Warshall finds the shortest path between every pair and tolerates general weights as long as there is no negative cycle. For a single source, Dijkstra does less work. When every pair is needed, the one matrix from Floyd-Warshall is convenient. The effort differs too: Dijkstra targets one starting point, while Floyd-Warshall fills the whole table, so its effort grows quickly as the number of vertices increases. If only one shortest distance is needed, a single Dijkstra run is lighter than computing every pair. Figure 9 compares them. An analogy: Dijkstra always extends the cheapest route found so far, one vertex at a time, while Floyd-Warshall asks, for every pair of places, whether adding one more stopover shortens the trip.

-----

![](img_p87_1.png)

**Figure 5. Dijkstra and Floyd-Warshall compared by what they find, the weights they**

*allow, and their output.*

**Other Resources:** *Web Dev Simplified, "Dijkstra's Algorithm in 60 Seconds," YouTube Short, 0:45, March*

[*14, 2024, https://www.youtube.com/shorts/8kucL88Ci8E.*](https://www.youtube.com/shorts/8kucL88Ci8E)

| I. | Activity No. 1 | Practicing Learned Skills: The Commuter's Choice |
|---|---|---|
| II. | Materials Needed: | pen and paper ruler |
| III. | Instructions: | Find Shortest Paths Two Ways Use Network R in Figure 10 for both sets. The source is A. Treat the graph as |

undirected with non-negative weights, and break ties alphabetically.

![](img_p87_2.png)

Figure 6. Network R for Dijkstra and Floyd-Warshall practice.

Guided practice. Work this set with the class.

1. Run Dijkstra from A. Write the tentative distances after each vertex is finalized, then the final shortest distance from A to each vertex.

|  | Independent practice. Work this set on your own. 2. Build the Floyd-Warshall distance matrix for Network R and give the all-pairs shortest distances. 3. Compare the A-row of your matrix with your Dijkstra distances from A. What do you notice? |
|---|---|
| IV. Reflection: | Answer each question to demonstrate your understanding of the lesson. 1. In Dijkstra, which vertex did you finalize second, and why? 2. Why should the A-row of the Floyd-Warshall matrix match the Dijkstra distances from A? |

| I. | Activity No. 2: | Assessing Learning Outcomes |
|---|---|---|
| II. | Materials Needed: | pen and paper |
| III. | Instructions: | Answer all three parts. No graphs are drawn here; each network is given by its list of weighted edges. |

Part I. Multiple Choice. Choose the best answer.

1. The length, or weight, of a path is

-----

A. the sum of its edge weights
B. the number of edges it uses
C. its largest edge weight
D. the number of vertices it visits
2. The single-source shortest-path problem asks for
A. the shortest paths from one source to every vertex
B. the shortest path between every pair of vertices
C. a spanning tree of the graph
D. the longest path in the graph
3. Dijkstra's algorithm requires that
A. every edge weight is non-negative
B. the graph is a tree
C. all weights are equal
D. the graph has no cycle
4. In Dijkstra, the next vertex to finalize is
A. the unfinalized vertex with the smallest tentative distance
B. the alphabetically first vertex
C. the vertex with the most neighbors
D. any vertex not yet visited
5. The Floyd-Warshall algorithm finds
A. the shortest distance between every pair of vertices
B. the shortest paths from one source only
C. a spanning tree
D. an Eulerian circuit
6. An app must answer the shortest distance between any two stations many times. The better choice is
A. run Dijkstra from scratch for every request
B. run Floyd-Warshall once and look up the matrix
C. use Floyd-Warshall only if some weight is negative
D. use Dijkstra because it is always faster

|  | Part II. Constructed Response. Show your work. Treat the graph as undirected with non-negative weights; break ties alphabetically. 1. A weighted graph has vertices A, B, C, D with edges AB = 2, AC = 6, BC = 3, BD = 5, and CD = 1. Run Dijkstra from A. Give the order in which vertices are finalized and the shortest distance from A to each vertex. 2. For the same graph, give the Floyd-Warshall shortest distance from C to every vertex, that is, the C-row of the all-pairs matrix. Part III. True or False with Reasoning. State true or false and give one reason. 1. The length of a path is the number of edges it uses. 2. Dijkstra's algorithm can be used when some edge weights are negative. 3. Floyd-Warshall finds the shortest distance between every pair of vertices. 4. The shortest path always uses the fewest edges. 5. For a single source with non-negative weights, Dijkstra finds the shortest distance to every vertex. |
|---|---|
| IV. Reflection: | Reflect on the key ideas discussed and answer each question accordingly. 1. What is the most important difference between single-source shortest paths and all-pairs shortest paths? 2. How can shortest-path algorithms help make decisions in real-world routing and network problems? 3. How do weighted graphs extend the ideas learned from unweighted graphs and spanning trees? |

| I. | Activity No. 3 | Extending and Reinforcing Learning |
|---|---|---|
| II. | Materials Needed: | pen and paper Calculator |

-----

| III. Instructions: | For Remediation: One Source, Step by Step Use the network in Figure 7. The source is A, and all weights are non-negative. Run Dijkstra only. Figure 7. A small weighted network for remediation practice with Dijkstra. 1. Write the tentative distances: A = 0, and the rest infinity. 2. Finalize the vertices one at a time, lowering a neighbor's distance whenever a shorter route appears. 3. List the shortest distance from A to each vertex. For Enhancement: All Pairs at Once Use the same network in Figure 16. Build the Floyd-Warshall distance matrix and give the all-pairs shortest distances. 1. Write the initial matrix: 0 on the diagonal, the edge weights, and infinity for missing edges. 2. Update the matrix through each vertex A, B, C, and D in turn. 3. Give the final all-pairs matrix. |
|---|---|
| IV. Reflection: | Using what you have learned from the lesson, provide answers to each question For Remediation Which vertex did you finalize second, and what was its distance? For Enhancement How does the A-row of your matrix compare with the Dijkstra distances from A? |

![](img_p89_1.png)