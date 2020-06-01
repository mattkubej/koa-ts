export default function(obj: object = {}, keys: string | string[]) {
  if (typeof keys === 'string') keys = keys.split(/ +/);
  return keys.reduce(function(ret, key) {
    if (null == obj[key]) return ret;
    ret[key] = obj[key];
    return ret;
  }, {});
}
