export const TILL_NUMBERS = [
  '111111',
  '222222',
  '333333',
  '444444',
]

export function getRandomTill() {
  return TILL_NUMBERS[
    Math.floor(Math.random() * TILL_NUMBERS.length)
  ]
}