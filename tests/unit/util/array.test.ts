import { describe, expect, it } from 'vitest';
import { eqArr } from '~/util/array';

describe('eqArr', () => {
    it('Should return true if both arrays are equal', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        expect(eqArr(arr1, arr2)).toBe(true);
    });
    it('Should return false if both arrays are not equal', () => {
        const arr1 = [1, 2, 4];
        const arr2 = [1, 2, 3];
        expect(eqArr(arr1, arr2)).toBe(false);
    });
    it('Should return false if both arrays are not equal in types', () => {
        const arr1 = [1, 2, '3'];
        const arr2 = [1, 2, 3];
        expect(eqArr(arr1, arr2)).toBe(false);
    });
    it('Should return false if size of both arrays are not equal', () => {
        const arr1 = [1, 2];
        const arr2 = [1, 2, 3];
        expect(eqArr(arr1, arr2)).toBe(false);
    });
    it('Should return false for not equal array of objects', () => {
        const arr1 = [{ id: '1', name: 'Ahmed' }];
        const arr2 = [{ id: '2', name: 'Mohammed' }];
        expect(eqArr(arr1, arr2)).toBe(false);
    });
});
