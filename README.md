# requestor_type   
A requestor is a construct created by Douglas Crockford in his [parseq](https://github.com/douglascrockford/parseq) and adapted in [curried-parseq](https://github.com/jlrwi/curried-parseq). A requestor represents a future result (or failure) of a generic piece of work.   
Requestors are structured as follows:   
```   
function requestor (callback) {   
    return function (parameter) {   
   
        <Initiate work without blocking>   
   
        <success: callback(result)>   
        <failure: callback(undefined, reason)>   
   
        return function cancel (reason) {   
            <cancel the work-in-progress>   
        };   
    };   
}   
```   
Note: returning a cancel function is optional, and a cancel function is not required to succeed when called.   
The callback function takes the form:   
```   
function callback (value, reason) {   
    if (value === undefined) {   
        // error case   
    } else {   
        // value holds result   
    }   
}   
```   
## Usage   
Call the default export as follows to create a [curried-static-land](https://github.com/jlrwi/curried-static-land) module:   
```   
import requestor_type from "@jlrwi/requestor-type";   
const requestor_module = requestor_type();   
```   
## Module methods   
### .create(f)   
Create a requestor from a non-blocking unary function.   
### .compose(a)(b)   
Returns a requestor where the result of requestor `b` is passed into   
requestor `a`.   
### .id(x)   
Returns a requestor that will return the value `x` unchanged.   
### .map(f)(a)   
Apply the function `f` to the (possible) result of a requestor `a`.   
### .ap(a)(b)   
Apply the function resulting from requestor `a` to the value resulting from requestor `b`.   
### .of(x)   
Create a requestor that returns the value `x`.   
### .chain(f)(a)   
Returns a requestor where the result of requestor `a` is passed into   
function `f` which returns another requestor.   
### .contramap(f)(a)   
Applies function `f` to the input for requestor `a`.   
### .promap(f)(g)(a)   
Applies function `f` to the input for requestor `a` and applies function `g` to its resulting value.   
### .validate(a)   
Validate if `a` is structured like a requestor.   
