const { describe, it, beforeEach, afterEach, expect, sinon } = require('../../../test-helper');
const airtable = require('../../../../lib/infrastructure/airtable');
const cache = require('../../../../lib/infrastructure/cache');
const courseGroupRepository = require('../../../../lib/infrastructure/repositories/course-group-repository');
const courseGroupSerializer = require('../../../../lib/infrastructure/serializers/airtable/course-group-serializer');

describe('Unit | Repository | course-group-repository', function() {

  const cacheKey = 'course-group-repository_list';
  let getRecords;

  beforeEach(function() {
    cache.flushAll();
    getRecords = sinon.stub(airtable, 'getRecords');
  });

  afterEach(function() {
    cache.flushAll();
    getRecords.restore();
  });

  const courseGroupsFromAirTable = [
    { name: 'courseGroups 1' },
    { name: 'courseGroups 2' }
  ];

  describe('#list', function() {

    describe('in the case data from airtable are not cached', function() {

      beforeEach(function() {
        getRecords.resolves(courseGroupsFromAirTable);
      });

      it('should query correctly airtable', function() {
        // Given
        const expectedQuery = {};

        // When
        courseGroupRepository.list();

        // Then
        expect(getRecords.calledWith('Groupes de tests', expectedQuery, courseGroupSerializer)).to.be.true;

      });

      it('should resolve course groups fetched from airtable', function() {

        // When
        const result = courseGroupRepository.list();

        // Then
        expect(result).to.eventually.deep.equal(courseGroupsFromAirTable);
      });

      it('should cache the challenge fetched from airtable', function(done) {

        // when
        courseGroupRepository.list().then(() => {

          // then
          cache.get(cacheKey, (err, cachedValue) => {
            expect(cachedValue).to.exist;
            done();
          });
        });
      });

    });

    describe('in the case data from airtable were cached before', function() {

      const courseGroupsFromCache = [
        { name: 'cached courseGroups 1' },
        { name: 'cached courseGroups 1' }
      ];

      it('should return data from the cache', function(done) {
        // given
        cache.set(cacheKey, courseGroupsFromCache);

        // when
        const result = courseGroupRepository.list();

        // then
        expect(getRecords.notCalled).to.be.true;
        expect(result).to.eventually.deep.equal(courseGroupsFromCache);
        done();
      });

      it('should reject with an error when the cache throw an error', function(done) {
        // given
        const cacheErrorMessage = 'Cache error';
        sinon.stub(cache, 'get', (key, callback) => {
          callback(new Error(cacheErrorMessage));
        });

        // when
        const result = courseGroupRepository.list();

        // then
        cache.get.restore();
        expect(result).to.be.rejectedWith(cacheErrorMessage);
        done();
      })

    });

  });
});
