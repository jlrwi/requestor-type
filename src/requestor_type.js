/*jslint
    fudge, node
*/

//MD # requestor_type/p
//MD A requestor is a construct created by Douglas Crockford in his
//MD [parseq](https://github.com/douglascrockford/parseq) and adapted in
//MD [curried-parseq](https://github.com/jlrwi/curried-parseq). A requestor
//MD represents a future result (or failure) of a generic piece of work./p
//MD Requestors are structured as follows:/p
//MD ```/p
//MD function requestor (callback) {/p
//MD     return function (parameter) {/p
//MD /p
//MD         <Initiate work without blocking>/p
//MD /p
//MD         <success: callback(result)>/p
//MD         <failure: callback(undefined, reason)>/p
//MD /p
//MD         return function cancel (reason) {/p
//MD             <cancel the work-in-progress>/p
//MD         };/p
//MD     };/p
//MD }/p
//MD ```/p
//MD Note: returning a cancel function is optional, and a cancel function is
//MD not required to succeed when called./p
//MD The callback function takes the form:/p
//MD ```/p
//MD function callback (value, reason) {/p
//MD     if (value === undefined) {/p
//MD         // error case/p
//MD     } else {/p
//MD         // value holds result/p
//MD     }/p
//MD }/p
//MD ```/p

//MD ## Module methods/p

import {
//test     flip,
//test     pipeN,
    constant,
    identity,
    compose
} from "@jlrwi/combinators";
import {
//test     log,
//test     array_map,
//test     lte,
//test     prop,
//test     add,
//test     equals,
//test     multiply,
//test     exponent,
//test     string_concat,
    type_check
} from "@jlrwi/esfunctions";

//test import parseq from "@jlrwi/curried-parseq";
//test import adtTests from "@jlrwi/adt_tests";
//test import jsCheck from "@jlrwi/jscheck";
//test let jsc = jsCheck();

const type_name = "Requestor";

//MD ### .create(f)/p
//MD Create a requestor from a non-blocking unary function./p
const create = function (unary_fx) {
    return function requestor(callback) {
        return function (value) {
            try {
                callback(unary_fx(value));
            } catch (exception) {
                callback(undefined, exception.message);
            }
        };
    };
};

//MD ### .compose(a)(b)/p
//MD Returns a requestor where the result of requestor `b` is passed into/p
//MD requestor `a`./p
// Semigroupoid :: <b -> c> -> <a -> b> -> <a -> c>
const adt_compose = function (bc_requestor) {
    return function (ab_requestor) {
        return function composed_requestor(final_callback) {
            return function (a) {
                let cancel_function;
                let cancel_reason;

// return to caller to invoke cancel fx for the current requestor
                const cancel = function (reason) {
// if we have a cancel function, invoke it
                    if (type_check("function")(cancel_function)) {
                        return cancel_function(reason);
                    }

// signal that user requested cancel during requestor lacking a cancel fx
                    cancel_reason = (
                        (reason === undefined)
                        ? "Composed requestor cancelled by user"
                        : reason
                    );
                };

                const ab_callback = function (b, reason) {
// If ab_requestor fails, abort
                    if (b === undefined) {
                        final_callback(undefined, reason);

// if cancel was requested during first requestor that didn't have a cancel fx,
// don't continue to second requestor
                    } else if (cancel_reason !== undefined) {
                        final_callback(undefined, cancel_reason);

// Start the next requestor and update the cancel function
                    } else {
                        cancel_function = bc_requestor(final_callback)(b);
                    }
                };

// Store ab_requestor's cancel function
                cancel_function = ab_requestor(ab_callback)(a);
                return cancel;
            };
        };
    };
};


//MD ### .id(x)/p
//MD Returns a requestor that will return the value `x` unchanged./p
// Category :: <a -> a>
const id = create(identity);

//MD ### .map(f)(a)/p
//MD Apply the function `f` to the (possible) result of a requestor `a`./p
// Functor :: (a -> b) -> <c -> a> -> <c -> b>
const map = compose(adt_compose)(create);

//MD ### .ap(a)(b)/p
//MD Apply the function resulting from requestor `a` to the value resulting
//MD from requestor `b`./p
// Note that (b -> c) is NOT a requestor
// Apply :: <a -> (b -> c)> -> <a -> b> -> <a -> c>
const ap = function (abc_requestor) {
    return function (ab_requestor) {
        return function ap_requestor(final_callback) {
            return function (a) {
                let cancel_function;
                let cancel_reason;

// Try to cancel whichever requestor is active at the moment
                const cancel = function (reason) {

// If there's a cancel_function, invoke it
                    if (type_check("function")(cancel_function)) {
                        return cancel_function(reason);
                    }

// No cancel function for current requestor - save message for later
                    cancel_reason = (
                        type_check("string")(reason)
                        ? reason
                        : "Apply requestor cancelled by user"
                    );
                };

// abc's callback will trigger ab next with (b -> c)
                const abc_callback = function (fbc, reason) {
// abc_requestor failed -> abort
                    if (fbc === undefined) {
                        final_callback(undefined, reason);

// User attempted to cancel but requestor didn't stop, so abort now
                    } else if (cancel_reason !== undefined) {
                        final_callback(undefined, cancel_reason);

// Invoke ab_requestor and store cancel fx
                    } else {
                        cancel_function = map(
                            fbc
                        )(
                            ab_requestor
                        )(
                            final_callback
                        )(
                            a
                        );
                    }
                };

// Invoke abc_requestor and store any cancel function
                cancel_function = abc_requestor(abc_callback)(a);
                return cancel;
            };
        };
    };
};

//MD ### .of(x)/p
//MD Create a requestor that returns the value `x`./p
// Applicative :: b -> <a->b>
const of = compose(create)(constant);

//MD ### .chain(f)(a)/p
//MD Returns a requestor where the result of requestor `a` is passed into/p
//MD function `f` which returns another requestor./p
// (b -> <a -> c>) is NOT a requestor, but returns a requestor
// Chain :: (b -> <a -> c>) -> <a -> b> -> <a -> c>
const chain = function (fbac) {
    return function (ab_requestor) {
        return function chain_requestor(final_callback) {
            return function (a) {
                let cancel_function;
                let cancel_reason;

// Try to cancel whichever requestor is active at the moment
                const cancel = function (reason) {

// If there's a cancel_function, invoke it
                    if (type_check("function")(cancel_function)) {
                        return cancel_function(reason);
                    }

// No cancel function for current requestor - save message for later
                    cancel_reason = (
                        type_check("string")(reason)
                        ? reason
                        : "Chained requestor cancelled by user"
                    );
                };

                const ab_callback = function (ac_requestor, reason) {
// ab_requestor failed - abort
                    if (ac_requestor === undefined) {
                        final_callback(undefined, reason);

// User attempted to cancel but requestor didn't stop
                    } else if (cancel_reason !== undefined) {
                        final_callback(undefined, cancel_reason);

// Finally invoke the <a->c> requestor with a
                    } else {
                        cancel_function = ac_requestor(final_callback)(a);
                    }
                };

// Extract the <a->c> requestor
                cancel_function = adt_compose(
                    create(fbac)
                )(
                    ab_requestor
                )(
                    ab_callback
                )(
                    a
                );
                return cancel;
            };
        };
    };
};

// Extend :: (<a -> b> -> c) -> <a -> b> -> <a -> c>
// fabc takes a requestor <a->b> and returns c
//      *it must call the requestor internally
//      *there is a (b->c) in the internal callback
//      *the result of sending <a->b> to fabc needs to be turned into a req
// !!! fabc applied with a requestor will not necessarily return immediately
//const extend = compose(create)(fabc);

//MD ### .contramap(f)(a)/p
//MD Applies function `f` to the input for requestor `a`./p
// Contravariant :: (b -> a) -> <a -> c> -> <b -> c>
const contramap = function (fba) {
    return function (ac_requestor) {
        return adt_compose(ac_requestor)(create(fba));
    };
};

//MD ### .promap(f)(g)(a)/p
//MD Applies function `f` to the input for requestor `a` and applies function
//MD `g` to its resulting value./p
// Profunctor :: (a -> b) -> (c -> d) -> <b -> c> -> <a -> d>
const promap = function (fab) {
    return function (fcd) {
        return function (bc_requestor) {
            return map(fcd)(contramap(fab)(bc_requestor));
        };
    };
};

//MD ### .validate(a)/p
//MD Validate if `a` is structured like a requestor./p
const validate = function (requestor) {
    const dummy_callback = function (ignore) {
        return;
    };

// Check if requestor is a function
    if (type_check("function")(requestor)) {
        return false;
    }

// See if the result of supplying a callback to requestor is also a function
    try {
        return type_check("function")(requestor(dummy_callback));
    } catch (ignore) {
        return false;
    }
};

const type_factory = function (ignore) {
    return Object.freeze({
        spec: "StaticLand",
        version: 1,
        type_name,
        ap,
        chain,
        compose: adt_compose,
        id,
        map,
        promap,
        of,
        contramap,
        create,
        validate
    });
};

//test const requestorT = type_factory();

//test const string_reverse = function (str) {
//test     return str.split("").reverse().join("");
//test };

//test const str_str_fxs = array_map(jsc.literal)([
//test     string_concat("_"),
//test     flip(string_concat)("!"),
//test     function (str) {
//test         return str.slice(0, 2);
//test     },
//test     string_reverse
//test ]);
/*
//test const str_str_reqs = array_map (jsc.literal)([
//test     {
//test         f: write_file ()("test_output.txt"),
//test         a: jsc.string(jsc.integer(1000, 10000), jsc.character())
//test     },
//test     {
//test         f: map (method ("toString")())(https_get ()),
//test         a: [covid_ozaukee, open_weather, frb_daily_rates]
//test     },
//test     {
//test         f: map (JSON.stringify)(read_directory ()),
//test         a: [".", "/", ".."]
//test     }
//test ]);

//test const str_str_bool_fxs = array_map(jsc.literal)([
//test     function (s) {
//test         return function (frag) {
//test             return s.endsWith(frag);
//test         };
//test     },
//test     function (s) {
//test         return function (frag) {
//test             return !(s.indexOf(frag) < 0);
//test         };
//test     },
//test     lte
//test ]);
*/
//test const str_num_fxs = array_map(jsc.literal)([
//test     prop("length"),
//test     function (str) {
//test         return str.codePointAt(0);
//test     },
//test     function (str) {
//test         return str.split("\n").length;
//test     }
//test ]);

//test const str_num_str_list = [
//test     function partial_reverse(s) {
//test         return function (len) {
//test             return string_reverse(s.substring(0, len));
//test         };
//test     },
//test     function string_repeat(str) {
//test         return function (count) {
//test             return str.repeat(count);
//test         };
//test     },
//test     function string_left(str) {
//test         return function (pos) {
//test             return str.slice(0, pos);
//test         };
//test     },
//test     function multibang(str) {
//test         return function (n) {
//test             return str + "!".repeat(n);
//test         };
//test     }
//test ];

//test const str_num_str_fxs = array_map(jsc.literal)(str_num_str_list);

//test const chainer = function (fabc) {
//test     return pipeN(
//test         flip(fabc),
//test         create,
//test         jsc.literal
//test     );
//test };

//test const num_str_str_chainers = array_map(
//test     chainer
//test )(
//test     str_num_str_list
//test );


//test const num_num_list = [
//test     add(10),
//test     exponent(2),
//test     multiply(3),
//test     multiply(-1),
//test     Math.floor
//test ];

//test const num_num_fxs = array_map(jsc.literal)(num_num_list);

//test const num_bool_fxs = array_map(jsc.literal)([
//test     function (x) {
//test         return (x % 2 === 0);
//test     },
//test     lte(10)
//test ]);

//test const predicate = function (verdict) {
//test     return function ({left, right, compare_with, input}) {
//test         if (input === undefined) {
//test             return;
//test         }
//test
//test         if (type_check("function")(input)) {
//test             input = input();
//test         }
//test
//test         const callback = function (value, ignore) {
//test             if (Array.isArray(value)) {
//test                 verdict(compare_with(value[0])(value[1]));
//test             }
//test         };
//test
//test         parseq.parallel()([left, right])(callback)(input);
//test     };
//test };

//test const test_requestor = function ({
//test     fail_rate = 0.5,
//test     delay_min = 0,
//test     delay_max = 1000
//test }) {
//test     return function (unary) {
//test         return function requestor(callback) {
//test             return function (value) {
//test                 const fail_value = Math.random();
//test                 const delay = Math.floor(
//test                     Math.random() * (delay_max - delay_min)
//test                 ) + delay_min;
//test
//test                 if (fail_value < fail_rate) {
//test                     callback(undefined, "failed with " + fail_value);
//test                 } else {
//test                     setTimeout(callback, delay, unary(value));
//test                 }
//test             };
//test         };
//test     };
//test };

//test const requestors_3000 = test_requestor({
//test     delay_max: 3000,
//test     fail_rate: 0.05
//test });

//test const test_roster = adtTests({
//test     functor: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(str_str_fxs)),
//test             f: jsc.wun_of(num_bool_fxs),
//test             g: jsc.wun_of(str_num_fxs)
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     apply: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(str_num_fxs)),
//test             u: compose(requestors_3000)(jsc.wun_of(str_num_str_fxs)),
//test             v: compose(requestors_3000)(jsc.wun_of(str_num_str_fxs))
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     applicative: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(str_num_fxs)),
//test             f: jsc.wun_of(num_num_fxs),
//test             u: compose(requestors_3000)(jsc.wun_of(str_num_str_fxs)),
//test             x: jsc.integer()
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     chain: {
//test         T: requestorT,
//test         signature: {
//test             f: jsc.wun_of(num_str_str_chainers),
//test             g: jsc.wun_of(num_str_str_chainers),
//test             u: compose(requestors_3000)(jsc.wun_of(str_num_fxs))
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     monad: {
//test         T: requestorT,
//test         signature: {
//test             a: jsc.integer(),
//test             f: jsc.wun_of(num_str_str_chainers),
//test             u: compose(requestors_3000)(jsc.wun_of(str_num_fxs))
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     profunctor: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(num_num_fxs)),
//test             f: jsc.wun_of(num_num_fxs),
//test             g: jsc.wun_of(str_num_fxs),
//test             h: jsc.wun_of(num_num_fxs),
//test             i: jsc.wun_of(num_num_fxs)
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     semigroupoid: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(num_num_fxs)),
//test             b: compose(requestors_3000)(jsc.wun_of(str_num_fxs)),
//test             c: compose(requestors_3000)(jsc.wun_of(str_str_fxs))
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     category: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(str_str_fxs))
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     contravariant: {
//test         T: requestorT,
//test         signature: {
//test             a: compose(requestors_3000)(jsc.wun_of(str_num_fxs)),
//test             f: jsc.wun_of(str_str_fxs),
//test             g: jsc.wun_of(str_str_fxs)
//test         },
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     }
//test });

//test test_roster.forEach(jsc.claim);
//test jsc.check({
//test     on_report: log,
//test     time_limit: 10000,
//test     nr_trials: 20
//test });

export default Object.freeze(type_factory);