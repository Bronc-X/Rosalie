import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { restaurants } from '../app/restaurants.ts';

const originalCoordinateSnapshot = {
  'food-02': [23.371834, 116.710949],
  'food-03': [23.352958, 116.671607],
  'food-04': [23.36264, 116.71098],
  'food-05': [23.37231, 116.746149],
  'food-06': [23.36596, 116.68469],
  'food-07': [23.364869, 116.693455],
  'food-08': [23.364446, 116.715713],
  'food-09': [23.36275, 116.71048],
  'food-10': [23.35839, 116.678094],
  'food-12': [23.362606, 116.732261],
  'food-13': [23.369511, 116.712391],
  'food-14': [23.361921, 116.706265],
  'food-15': [23.36872, 116.72074],
  'food-17': [23.3683, 116.71076],
  'food-18': [23.370022, 116.712769],
  'food-20': [23.365381, 116.728841],
  'food-21': [23.361845, 116.70359],
  'food-23': [23.361979, 116.756854],
  'food-24': [23.370509, 116.710069],
  'food-25': [23.365991, 116.695272],
  'food-28': [23.36986, 116.70733],
  'food-29': [23.359825, 116.677276],
  'food-31': [23.37727, 116.70811],
  'food-32': [23.37182, 116.71271],
  'food-35': [23.352785, 116.713816],
  'food-36': [23.376139, 116.71395],
  'food-37': [23.374267, 116.714287],
  'food-38': [23.352949, 116.739706],
  'food-39': [23.358366, 116.683223],
  'food-40': [23.3669, 116.71894],
  'food-41': [23.373166, 116.747332],
  'food-42': [23.356219, 116.737873],
  'food-44': [23.35506, 116.71245],
  'food-45': [23.365507, 116.718175],
  'food-46': [23.374962, 116.699812],
  'food-47': [23.36452, 116.73831],
  'food-48': [23.363873, 116.710519],
  'food-49': [23.36452, 116.71074],
  'food-50': [23.361122, 116.713093],
  'food-51': [23.361685, 116.710909],
  'food-52': [23.366721, 116.683253],
  'food-53': [23.28271, 116.721477],
} as const;

test('keeps all 53 restaurant IDs stable and preserves the 42 original coordinate tuples', () => {
  assert.deepEqual(
    restaurants.map((restaurant) => restaurant.id),
    Array.from({ length: 53 }, (_, index) => `food-${String(index + 1).padStart(2, '0')}`),
  );

  for (const [id, coordinates] of Object.entries(originalCoordinateSnapshot)) {
    assert.deepEqual(restaurants.find((restaurant) => restaurant.id === id)?.coordinates, coordinates);
  }
});

test('adds the five reliably verified Shantou locations as GCJ-02 coordinates', () => {
  const expected = {
    '白埕灼肉': ['金平区金埕路4号新白埕农副产品批零点195号', [23.375798, 116.694295]],
    '公园路牛肉丸': ['金平区小公园街道公园路5号101（近人民广场）', [23.354573, 116.683161]],
    '金园白粥': ['金平区金园路7号底层06号房之二', [23.370385, 116.702616]],
    '老王炒糕粿': ['金平区民族路2号', [23.355355, 116.675365]],
    '酱心籽意': ['金平区金砂东路99号君悦华庭1栋一层105', [23.36684, 116.715321]],
  } as const;

  for (const [name, [address, coordinates]] of Object.entries(expected)) {
    const restaurant = restaurants.find((candidate) => candidate.name === name);
    assert.ok(restaurant, `${name} should remain in the seed list`);
    assert.equal(restaurant.address, address);
    assert.deepEqual(restaurant.coordinates, coordinates);
    assert.equal(restaurant.coordinateSystem, 'gcj02');
    assert.equal(restaurant.locationStatus, 'verified');
  }
});

test('keeps the six ambiguous locations pending with an explicit reason', () => {
  const reasons = {
    '纪德来甜汤': '存在金墩店和尚好旗舰店两个同名分店，原单无法确认具体分店。',
    '正记饮食店': '仅找到名称不同的“正记小食店”候选，不能可靠判定为同一家。',
    '福乐': '名称过于宽泛，且候选商户主营类别与原单冲突。',
    '咸面线': '原条目仅为菜名，无法唯一绑定具体商户。',
    '龙眼夜豆浆': '原条目属于片区描述，存在多个合理候选，无法确认具体门店。',
    '洪记炒糕粿': '仅有“汕头四中旁”线索，未找到可核验的精确同名结果。',
  } as const;

  for (const [name, reason] of Object.entries(reasons)) {
    const restaurant = restaurants.find((candidate) => candidate.name === name);
    assert.ok(restaurant, `${name} should remain in the seed list`);
    assert.equal(restaurant.locationStatus, 'pending');
    assert.equal(restaurant.coordinates, undefined);
    assert.equal(restaurant.locationNote, reason);
  }
});

test('separates location, recommendation, and experience state', () => {
  const avoided = restaurants.find((restaurant) => restaurant.name === '月眉湾');
  const pending = restaurants.find((restaurant) => restaurant.name === '纪德来甜汤');

  assert.equal(avoided?.locationStatus, 'verified');
  assert.equal(avoided?.recommendationStatus, 'avoid');
  assert.equal(pending?.locationStatus, 'pending');
  assert.equal(pending?.recommendationStatus, 'normal');
  assert.ok(restaurants.every((restaurant) => restaurant.state === 'wishlist'));
});

