import * as commons from '../src/commons.js';

describe('', () => {
  it('startsWithArray', () => {
    expect(commons.startsWithArray([1, 2, 3, 4], [1, 2, 3])).toBe(true);
    expect(commons.startsWithArray([1, 2, 3, 4], [2, 3, 4], 1)).toBe(true);
  });
  it('indexOfArray', () => {
    expect(commons.indexOfArray([1, 2, 3, 4], [1, 2, 3])).toBe(0);
    expect(commons.indexOfArray([1, 2, 3, 4], [1, 3])).toBe(-1);
    expect(commons.indexOfArray([1, 2, 3, 4], [2, 3, 4], 1)).toBe(1);
    expect(commons.indexOfArray([1, 2, 3, 4], [2, 3, 4], 2)).toBe(-1);
  });
  it('concatArrays', () => {
    let arrays = [
      new Uint8Array([2, 101, 108, 108, 111]),
      new Uint8Array([32]),
      new Uint8Array([87, 111, 114, 108, 100, 33]),
      new Uint8Array([]),
    ];
    let concatenated = new Uint8Array([2, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]);
    expect(commons.concatArrays(arrays)).toEqual(concatenated);
  });
  it('toHexString', () => {
    let arr = new Uint8Array(
      [0x20, 0xb4, 0xf4, 0x21, 0xb1, 0xf6, 0x4b, 0x3f, 0xa7, 0x46, 0x8f, 0x65, 0x77, 0xf0, 0x0d, 0xa2]);
    let str = '20b4f421b1f64b3fa7468f6577f00da2';
    expect(commons.toHexString(arr)).toBe(str);
  });
  it('fromHexString', () => {
    let arr = new Uint8Array(
      [0x20, 0xb4, 0xf4, 0x21, 0xb1, 0xf6, 0x4b, 0x3f, 0xa7, 0x46, 0x8f, 0x65, 0x77, 0xf0, 0x0d, 0xa2]);
    let str = '20b4f421b1f64b3fa7468f6577f00da2';
    expect(commons.fromHexString(str)).toEqual(arr);
  });
  it('extname', () => {
    expect(commons.extname('README.txt')).toBe('.txt');
    expect(commons.extname('README')).toBe('');
    expect(commons.extname('a.tar.gz')).toBe('.gz');
    expect(commons.extname('.rc')).toBe('');
  });
});
