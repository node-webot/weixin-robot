function getSample(size) {
  var arr = this;
  var shuffled = arr.slice(0), i = arr.length, min = Math.max(0, i - size), temp, index;
  while (i-- > min) {
    index = Math.round(i * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
};
Array.prototype.sample = getSample;

module.exports = {
  sample: function(arr, popu) {
    return getSample.call(arr, popu);
  }
};
