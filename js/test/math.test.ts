import { add } from '../src';

import * as mocha from 'mocha';
import * as chai from 'chai';

const expect = chai.expect;
describe('My math library', () => {

  it('should be able to add things correctly' , () => {
    expect(add(3,4)).to.equal(7);
  });

});
