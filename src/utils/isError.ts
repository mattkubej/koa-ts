// accounting from SystemErrors returned from Stream, 
// which have an instance of object
export default function(e: any) {
  return e instanceof Error || (e && 
    typeof e.message === 'string' && 
    typeof e.stack === 'string');
}
