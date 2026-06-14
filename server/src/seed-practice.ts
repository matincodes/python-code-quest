import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const practiceChallenges = [
  {
    title: 'Hello Cosmos',
    description: 'Welcome to the Practice Arena! Your first task is simple: print a greeting to the cosmos.',
    expectedOutput: 'Hello, Cosmos!',
    points: 10,
    difficulty: 1,
    timeLimit: 60,
    hints: ['Use the built-in print() function in Python.', "Make sure to match the exact spelling and punctuation: 'Hello, Cosmos!'"],
    starterCode: '# Write your code below\n',
    sortOrder: 1,
  },
  {
    title: 'Countdown Sequence',
    description: 'We need to initiate the launch sequence. Write a loop that prints the numbers 3, 2, 1 on separate lines, followed by "LIFTOFF!".',
    expectedOutput: '3\n2\n1\nLIFTOFF!',
    points: 20,
    difficulty: 2,
    timeLimit: 120,
    hints: ['You can use a for loop or a while loop.', 'The range() function might be useful.', 'Don\'t forget to print "LIFTOFF!" at the end.'],
    starterCode: '# Write your code below\n',
    sortOrder: 2,
  },
  {
    title: 'Fuel Calculation',
    description: 'Given a list of fuel tank capacities, calculate the total fuel available. The list is provided as `tanks = [150, 200, 50, 300]`. Print the total sum.',
    expectedOutput: '700',
    points: 20,
    difficulty: 2,
    timeLimit: 90,
    hints: ['You can use a for loop to iterate over the list and keep a running total.', 'Alternatively, use the built-in sum() function.'],
    starterCode: 'tanks = [150, 200, 50, 300]\n# Write your code below\n',
    sortOrder: 3,
  },
  {
    title: 'Alien Translator',
    description: 'An alien message has been intercepted, but all the vowels are missing! The message is `msg = "Hll, rthlngs!"`. Write code to print the length of this string.',
    expectedOutput: '13',
    points: 10,
    difficulty: 1,
    timeLimit: 60,
    hints: ['Use the built-in len() function to get the length of a string.'],
    starterCode: 'msg = "Hll, rthlngs!"\n# Write your code below\n',
    sortOrder: 4,
  },
  {
    title: 'Prime Coordinates',
    description: 'The secret base is located at the 5th prime number. Write a program to find and print the 5th prime number.',
    expectedOutput: '11',
    points: 30,
    difficulty: 3,
    timeLimit: 300,
    hints: ['A prime number is only divisible by 1 and itself.', 'The first few primes are 2, 3, 5, 7...', 'You can use a loop to check numbers sequentially until you find 5 primes.'],
    starterCode: '# Write your code below\n',
    sortOrder: 5,
  }
];

async function main() {
  console.log('Seeding practice challenges...');
  
  // Clear existing practice challenges just to be clean
  await prisma.practiceChallenge.deleteMany();
  
  for (const challenge of practiceChallenges) {
    await prisma.practiceChallenge.create({
      data: challenge
    });
  }
  
  console.log('Successfully seeded 5 practice challenges!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
