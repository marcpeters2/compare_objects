import * as _ from "lodash";
const sortDeep = require("sort-deep-object-arrays"); // This package doesn't support ES6 "import" syntax


/** Compares two Javascript objects or arrays and determines whether or not they have an "identical structure".  An
 *  "identical structure" means:
 *      - All objects have the same keys
 *      - All values are of the same type
 *      - All arrays are the same length
 *      - All objects contained within arrays also have the same structure (although they
 *        may appear in a different order)
 *
 * @param obj1 The first object/array for comparison
 * @param obj2 The first object/array for comparison
 * @returns An object, with:
 *      - property "structureIsIdentical" containing a boolean value that is true if the two object
 *      structures are identical, and false otherwise
 *      - property "pathWhereStructureDiffers" containing a string describing the first
 *      path in the two objects that was found to be different.  If "structureIsIdentical=true", this property
 *      is not present.
 *      - property "propertiesChanged" containing an array of primitive property names that have changed across the two
 *      objects.  If "structureIsIdentical=false", this property is not present.
 */
export function compareObjects(obj1: any, obj2: any): ICompareObjectsResult {

    let pathWhereStructureDiffers = null;
    let propertiesChanged = [];

    const compare = (object1, object2, path = "", parent) => {

        const objectj1IsObject = _.isObject(object1);
        const object1IsArray = _.isArray(object1);
        const parentIsArray = _.isArray(parent);

        if (typeof object1 !== typeof object2) {
            // Case 1: The things we are comparing have different types.  Consider the
            // object structures to be different.
            pathWhereStructureDiffers = path;
            return false;
        } else if (!objectj1IsObject && !object1IsArray) {
            // Case 2: The things we are comparing are not "deep"; there is no more structure to compare.  Consider
            // the object structures to be identical.
            // TODO: the equality comparison below won't work for all types; should clarify what types are
            //       supported by this method or compare objects differently based on their type
            if (object1 !== object2 && !parentIsArray) {
                const pathParts = path.split(".");
                propertiesChanged.push(pathParts[pathParts.length - 1]);
            }
            return true;
        }

        if (_.isArray(object1)) {
            if (object1.length !== object2.length) {
                // Case 3: We are comparing two arrays, but they have different lengths.
                pathWhereStructureDiffers = path;
                return false;
            }

            // Case 4: We are comparing two arrays.  Recurse on each element of the array and return true only if all
            // recursions return true.
            return object1.reduce((acc, val, index) => {
                return acc && compare(object1[index], object2[index], `${path}[${index}]`, object1);
            }, true);
        } else {
            const object1Keys = _.keys(object1);
            const object2Keys = _.keys(object2);
            const differentKeys = _.xor(object1Keys, object2Keys);
            const keysAreIdentical = differentKeys.length === 0;

            if (!keysAreIdentical) {
                // Case 5: We are comparing two objects, but they have different keys.
                pathWhereStructureDiffers = `${path}.${differentKeys[0]}`;
                return false;
            }

            // Case 6: We are comparing two objects with identical keys.  Recurse on all object values, and return true
            // only if all recursions return true.
            const valuesAreIdentical = _.keys(object1).reduce((acc, key) => {
                return acc && compare(object1[key], object2[key], `${path}.${key}`, object1);
            }, true);

            return valuesAreIdentical;
        }
    };

    // Deeply sort the objects so that array comparison works as expected, even
    // if array elements in the two source objects are not in the same order.
    let sortedObj1 = sortDeep(obj1);
    let sortedObj2 = sortDeep(obj2);

    const structureIsIdentical = compare(sortedObj1, sortedObj2, "", null);

    if (pathWhereStructureDiffers) {
        pathWhereStructureDiffers = pathWhereStructureDiffers.substr(1);
    }

    let result: ICompareObjectsResult = { structureIsIdentical };

    if (!structureIsIdentical) {
        result.pathWhereStructureDiffers = pathWhereStructureDiffers;
    } else {
        result.propertiesChanged = _.uniq(propertiesChanged);
    }

    return result;
}
