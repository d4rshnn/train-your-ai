// Single source of truth for the 28 example images (art + simulation logic).
// Images live in src/assets/images/{train,test}/; sources in CREDITS.md and docs/IMAGE_SHORTLIST.md.
// Attributes describe the reviewed candidate photo for each slot (updated after the visual review, see docs/IMAGE_SHORTLIST.md).
// test-06 'side-walk' means a side view (the photo is a sitting side profile).

export type Label = 'cat' | 'notcat'
export type Species = 'cat' | 'dog' | 'fox' | 'rabbit' | 'raccoon' | 'bird'
export type Colour =
  | 'white' | 'black' | 'orange' | 'tabby' | 'grey' | 'calico'
  | 'tuxedo' | 'siamese' | 'cream' | 'silver' | 'bengal' | 'tortie'
  | 'brown' | 'red' // non-cat coats
export type Fur = 'short' | 'fluffy' | 'feathers'
export type Pose = 'front-sit' | 'side-walk' | 'lying' | 'back-view' | 'perched'
export type Age = 'kitten' | 'adult'
export type Scale = 'close' | 'mid' | 'far'
export type Background = 'indoor' | 'sofa' | 'window' | 'garden' | 'street' | 'plain'

export type Example = {
  id: string
  label: Label
  species: Species
  colour: Colour
  fur: Fur
  pose: Pose
  age: Age
  scale: Scale
  bg: Background
  /** Path relative to repo root (512x512 WebP). */
  file: string
}

const train = 'src/assets/images/train/'
const test = 'src/assets/images/test/'

/** 16 cats + 4 non-cats = the 20-card training pool shown on S3. */
export const TRAINING_EXAMPLES: Example[] = [
  // White fluffy x4 (the "trap" set)
  { id: 'train-01', label: 'cat', species: 'cat', colour: 'white', fur: 'fluffy', pose: 'front-sit', age: 'adult', scale: 'close', bg: 'indoor', file: train + 'train-01-white-fluffy-sit.webp' },
  { id: 'train-02', label: 'cat', species: 'cat', colour: 'white', fur: 'fluffy', pose: 'lying', age: 'adult', scale: 'mid', bg: 'sofa', file: train + 'train-02-white-fluffy-lying.webp' },
  { id: 'train-03', label: 'cat', species: 'cat', colour: 'white', fur: 'fluffy', pose: 'front-sit', age: 'kitten', scale: 'close', bg: 'plain', file: train + 'train-03-white-fluffy-kitten.webp' },
  { id: 'train-04', label: 'cat', species: 'cat', colour: 'white', fur: 'fluffy', pose: 'side-walk', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-04-white-fluffy-walk.webp' },
  // Black x2 (none may be short+side-walk: that is the Round-1 test cat)
  { id: 'train-05', label: 'cat', species: 'cat', colour: 'black', fur: 'short', pose: 'lying', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-05-black-short-lying.webp' },
  { id: 'train-06', label: 'cat', species: 'cat', colour: 'black', fur: 'fluffy', pose: 'front-sit', age: 'adult', scale: 'mid', bg: 'sofa', file: train + 'train-06-black-fluffy-sit.webp' },
  // Orange / tabby x3
  { id: 'train-07', label: 'cat', species: 'cat', colour: 'orange', fur: 'fluffy', pose: 'lying', age: 'kitten', scale: 'close', bg: 'sofa', file: train + 'train-07-orange-kitten-lying.webp' },
  { id: 'train-08', label: 'cat', species: 'cat', colour: 'orange', fur: 'short', pose: 'back-view', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-08-orange-short-back.webp' },
  { id: 'train-09', label: 'cat', species: 'cat', colour: 'silver', fur: 'fluffy', pose: 'side-walk', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-09-silver-fluffy-walk.webp' },
  // Grey / calico / other x3
  { id: 'train-10', label: 'cat', species: 'cat', colour: 'tabby', fur: 'short', pose: 'front-sit', age: 'adult', scale: 'mid', bg: 'street', file: train + 'train-10-tabby-short-sit.webp' },
  { id: 'train-11', label: 'cat', species: 'cat', colour: 'bengal', fur: 'short', pose: 'lying', age: 'adult', scale: 'mid', bg: 'sofa', file: train + 'train-11-bengal-short-lying.webp' },
  { id: 'train-12', label: 'cat', species: 'cat', colour: 'grey', fur: 'short', pose: 'front-sit', age: 'kitten', scale: 'close', bg: 'garden', file: train + 'train-12-grey-kitten-sit.webp' },
  // Extras to reach 16 cats: tuxedo (far), tabby lying (medium distance, replaces the far-away siamese), cream, tortie
  { id: 'train-13', label: 'cat', species: 'cat', colour: 'tuxedo', fur: 'short', pose: 'front-sit', age: 'adult', scale: 'far', bg: 'street', file: train + 'train-13-tuxedo-far-sit.webp' },
  { id: 'train-14', label: 'cat', species: 'cat', colour: 'tabby', fur: 'short', pose: 'lying', age: 'adult', scale: 'mid', bg: 'street', file: train + 'train-14-tabby-lying.webp' },
  { id: 'train-15', label: 'cat', species: 'cat', colour: 'cream', fur: 'fluffy', pose: 'front-sit', age: 'adult', scale: 'close', bg: 'window', file: train + 'train-15-cream-fluffy-sit.webp' },
  { id: 'train-16', label: 'cat', species: 'cat', colour: 'tortie', fur: 'short', pose: 'back-view', age: 'adult', scale: 'mid', bg: 'street', file: train + 'train-16-tortie-short-back.webp' },
  // Non-cats x4
  { id: 'train-17', label: 'notcat', species: 'dog', colour: 'brown', fur: 'short', pose: 'front-sit', age: 'adult', scale: 'mid', bg: 'sofa', file: train + 'train-17-dog.webp' },
  { id: 'train-18', label: 'notcat', species: 'fox', colour: 'red', fur: 'fluffy', pose: 'front-sit', age: 'adult', scale: 'close', bg: 'garden', file: train + 'train-18-fox.webp' },
  { id: 'train-19', label: 'notcat', species: 'rabbit', colour: 'brown', fur: 'short', pose: 'front-sit', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-19-rabbit.webp' },
  { id: 'train-20', label: 'notcat', species: 'raccoon', colour: 'grey', fur: 'fluffy', pose: 'side-walk', age: 'adult', scale: 'mid', bg: 'garden', file: train + 'train-20-raccoon.webp' },
]

/** 8 unseen test images. test-01 (black cat) is the Round-1 hero and never appears in the training pool. */
export const TEST_EXAMPLES: Example[] = [
  { id: 'test-01', label: 'cat', species: 'cat', colour: 'black', fur: 'short', pose: 'side-walk', age: 'adult', scale: 'mid', bg: 'street', file: test + 'test-01-black-cat.webp' },
  { id: 'test-02', label: 'cat', species: 'cat', colour: 'tabby', fur: 'short', pose: 'front-sit', age: 'kitten', scale: 'close', bg: 'sofa', file: test + 'test-02-tabby-kitten.webp' },
  { id: 'test-03', label: 'cat', species: 'cat', colour: 'grey', fur: 'short', pose: 'front-sit', age: 'adult', scale: 'far', bg: 'garden', file: test + 'test-03-grey-far.webp' },
  { id: 'test-04', label: 'cat', species: 'cat', colour: 'orange', fur: 'fluffy', pose: 'back-view', age: 'adult', scale: 'mid', bg: 'garden', file: test + 'test-04-orange-fluffy-back.webp' },
  { id: 'test-05', label: 'cat', species: 'cat', colour: 'white', fur: 'short', pose: 'lying', age: 'adult', scale: 'mid', bg: 'street', file: test + 'test-05-white-short-lying.webp' },
  { id: 'test-06', label: 'cat', species: 'cat', colour: 'calico', fur: 'short', pose: 'side-walk', age: 'adult', scale: 'close', bg: 'garden', file: test + 'test-06-calico-side.webp' },
  { id: 'test-07', label: 'notcat', species: 'dog', colour: 'black', fur: 'fluffy', pose: 'front-sit', age: 'adult', scale: 'close', bg: 'garden', file: test + 'test-07-dog.webp' },
  { id: 'test-08', label: 'notcat', species: 'bird', colour: 'brown', fur: 'feathers', pose: 'perched', age: 'adult', scale: 'far', bg: 'garden', file: test + 'test-08-bird.webp' },
]

export const ALL_EXAMPLES: Example[] = [...TRAINING_EXAMPLES, ...TEST_EXAMPLES]
