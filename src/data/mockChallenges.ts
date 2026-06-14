export interface Challenge {
  id: string;
  title: string;
  description: string;
  expectedOutput: string;
  points: 10 | 20 | 30;
  difficulty: 1 | 2 | 3;
  timeLimit: number;
  hints: string[];
  starterCode?: string;
}

export const mockChallenges: Challenge[] = [
  // Difficulty 1 — print, basic math, variables
  {
    id: 'ch_001',
    title: 'THE GREETING VAULT',
    description: 'Your first mission, Commander! Print the exact message:\n\nHello, Commander!',
    expectedOutput: 'Hello, Commander!',
    points: 10,
    difficulty: 1,
    timeLimit: 120,
    hints: ['Use the print() function.', 'Remember to include quotation marks around the text.'],
    starterCode: '# Type your code here\n',
  },
  {
    id: 'ch_002',
    title: 'NUMBER CRUNCHER 3000',
    description: 'The ship\'s computer needs a calculation. Print the result of 17 + 25.',
    expectedOutput: '42',
    points: 10,
    difficulty: 1,
    timeLimit: 120,
    hints: ['Use print() with a math expression inside.', 'Try: print(17 + 25)'],
    starterCode: '# Calculate and print the answer\n',
  },
  {
    id: 'ch_003',
    title: 'VARIABLE LAUNCH PAD',
    description: 'Create a variable called mission and set it to the text "Apollo". Then print the variable.',
    expectedOutput: 'Apollo',
    points: 10,
    difficulty: 1,
    timeLimit: 120,
    hints: ['Variables store information. Try: mission = "Apollo"', 'Then print(mission) to show it.'],
    starterCode: '# Create your variable here\n',
  },
  // Difficulty 2 — if/else, lists, input
  {
    id: 'ch_004',
    title: 'THE DECISION ENGINE',
    description: 'Set a variable called fuel to 50. If fuel is greater than 30, print "Engines ready!". Otherwise print "Need more fuel!".',
    expectedOutput: 'Engines ready!',
    points: 20,
    difficulty: 2,
    timeLimit: 150,
    hints: ['Start with: fuel = 50', 'Use an if/else statement: if fuel > 30:'],
    starterCode: 'fuel = 50\n# Write your if/else here\n',
  },
  {
    id: 'ch_005',
    title: 'CREW MANIFEST',
    description: 'Create a list called crew with three names: "Zara", "Kai", "Orion". Print the second crew member.',
    expectedOutput: 'Kai',
    points: 20,
    difficulty: 2,
    timeLimit: 150,
    hints: ['Lists start at index 0. So the second item is at index 1.', 'Try: crew = ["Zara", "Kai", "Orion"]  then  print(crew[1])'],
    starterCode: '# Create your crew list\n',
  },
  {
    id: 'ch_006',
    title: 'EVEN OR ODD SCANNER',
    description: 'Set a variable called number to 7. If number is even, print "Even frequency!". If odd, print "Odd signal detected!".',
    expectedOutput: 'Odd signal detected!',
    points: 20,
    difficulty: 2,
    timeLimit: 150,
    hints: ['The modulo operator % gives the remainder. 7 % 2 gives 1 (odd).', 'if number % 2 == 0: it\'s even!'],
    starterCode: 'number = 7\n# Check even or odd\n',
  },
  // Difficulty 3 — loops, functions, list operations
  {
    id: 'ch_007',
    title: 'THE FOR LOOP VAULT',
    description: 'Use a for loop to print the numbers 1 through 5, each on a new line.',
    expectedOutput: '1\n2\n3\n4\n5',
    points: 30,
    difficulty: 3,
    timeLimit: 180,
    hints: ['range(1, 6) gives you numbers 1 to 5.', 'Try: for i in range(1, 6): then print(i) on the next line (indented!).'],
    starterCode: '# Write your for loop here\n',
  },
  {
    id: 'ch_008',
    title: 'FUNCTION FACTORY',
    description: 'Create a function called launch() that prints "3... 2... 1... Blast off!". Then call the function.',
    expectedOutput: '3... 2... 1... Blast off!',
    points: 30,
    difficulty: 3,
    timeLimit: 180,
    hints: ['Define with: def launch():', 'Don\'t forget to call your function: launch()'],
    starterCode: '# Define your function\n',
  },
  {
    id: 'ch_009',
    title: 'LIST MISSION CONTROL',
    description: 'Create a list called scores with values [10, 25, 8, 42, 15]. Print the total sum of all scores.',
    expectedOutput: '100',
    points: 30,
    difficulty: 3,
    timeLimit: 180,
    hints: ['Python has a built-in sum() function!', 'Try: print(sum(scores))'],
    starterCode: 'scores = [10, 25, 8, 42, 15]\n# Print the sum\n',
  },
];
