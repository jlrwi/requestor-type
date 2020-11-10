/*jslint
    fudge, node
*/

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

//test import parseq from "@jlrwi/parseq";
//test import adtTests from "@jlrwi/adt_tests";
//test import jsCheck from "@jlrwi/jscheck";
//test let jsc = jsCheck();

const type_name = "Requestor";

//A requestor represents a future result (or failure) of a generic piece of work
//Requestors are called as follows:
//  requestor (callback) (parameter)
//where callback takes the form:
//  callback (value, reason) {}
//and requestor can return a cancel function of the form:
//  cancel (reason)

//create <a -> b>
const create = function (unary_fx) {
    return function requestor (callback) {
        return function (value) {
            try {
                return callback (unary_fx (value));
            } catch (err) {
                return callback (undefined, err);
            }
        };
    };
};


// Functor :: (a -> b) -> F<c->a> -> F<c->b>
const map = function (f) {
    return function (requestor) {

        // Return a new requestor by applying a callback to original
        return function (callback) {

            const mapped_callback = function (value, reason) {
                return (
                    value === undefined
                    ? callback (undefined, reason)
                    : callback (f (value))
                );
            };

            return requestor (mapped_callback);
        };
    };
};

// Apply :: <a -> (b -> c)> -> <a -> b> -> <a -> c>
const ap = function (abc_requestor) {
    return function (ab_requestor) {
        return function (final_callback) {
            return function (a) {
                // Use result of abc_requestor (b->c) to build callback for ab
                const build_ab_callback = function (fbc) {
                    return function (b, reason) {
                        if (b === undefined) {
                            final_callback (undefined, reason);
                        } else {
                            // Create a requestor from fbc and invoke it with b
                            create (fbc) (final_callback) (b);
                        }
                    };
                };

                // abc's callback will trigger ab next with (b -> c)
                const abc_callback = function (fbc, reason) {
                    if (fbc === undefined) {
                        final_callback (undefined, reason);
                    } else {
                        // value is (b -> c)
                        ab_requestor (build_ab_callback (fbc)) (a);
                    }
                };

                abc_requestor (abc_callback) (a);
            };
        };
    };
};

// Applicative :: b -> <a->b>
const of = compose (create) (constant);

// Chain :: (b -> <a -> c>) -> <a -> b> -> <a -> c>
const chain = function (fbac) {
    return function (ab_requestor) {
        return function (final_callback) {
            return function (a) {

                const ac_callback = function (c, reason) {
                    if (c === undefined) {
                        final_callback (undefined, reason);
                    } else {
                        final_callback (c);
                    }
                };

                // ab's callback will trigger ab next with (b -> c)
                const ab_callback = function (b, reason) {
                    if (b === undefined) {
                        final_callback (undefined, reason);
                    } else {
                        // fbac produces an <a->c> requestor
                        fbac (b) (ac_callback) (a);
                    }
                };

                ab_requestor (ab_callback) (a);
            };
        };
    };
};

// Profunctor :: (a -> b) -> (c -> d) -> <b -> c> -> <a -> d>
const promap = function (fab) {
    return function (fcd) {
        return function (bc_requestor) {
            return map (fcd) (contramap (fab) (bc_requestor));
        };
    };
};

// Contravariant :: (b -> a) -> <a -> c> -> <b -> c>
const contramap = function (f) {
    return function (ac_requestor) {
        return function (callback) {
            return compose (ac_requestor (callback)) (f);
        };
    };
};

// Extend :: (<a -> b> -> c) -> <a -> b> -> <a -> c>
// fabc takes a requestor <a->b> and returns c
//      *it must call the requestor internally
//      *there is a (b->c) in the internal callback
//      *the result of sending <a->b> to fabc needs to be turned into a req
// !!! fabc applied with a requestor will not necessarily return immediately
//const extend = compose (create) (fabc);

const adt_compose = function (bc_requestor) {
    return function (ab_requestor) {
        return function (final_callback) {
            const ab_callback = function (b, reason) {
                if (b === undefined) {
                    final_callback (undefined, reason);
                } else {
                    bc_requestor (final_callback) (b);
                }
            };
            return ab_requestor (ab_callback);
        };
    };
};

const id = create (identity);

const validate = function (requestor) {
    const dummy_callback = function (ignore) {
        return;
    };

    if (type_check ("function") (requestor)) {
        try {
            return type_check ("function") (requestor (dummy_callback));
        } catch (ignore) {
            return false;
        }
    }

    return false;
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

//test const requestorT = type_factory ();

//test const string_reverse = function (str) {
//test     return str.split("").reverse().join("");
//test };

//test const str_str_fxs = array_map (jsc.literal) ([
//test     string_concat ("_"),
//test     flip (string_concat) ("!"),
//test     function (str) {
//test         return str.slice(0, 2);
//test     },
//test     string_reverse
//test ]);
/*
//test const str_str_reqs = array_map (jsc.literal) ([
//test     {
//test         f: write_file () ("test_output.txt"),
//test         a: jsc.string(jsc.integer(1000, 10000), jsc.character())
//test     },
//test     {
//test         f: map (method ("toString") ()) (https_get ()),
//test         a: [covid_ozaukee, open_weather, frb_daily_rates]
//test     },
//test     {
//test         f: map (JSON.stringify) (read_directory ()),
//test         a: [".", "/", ".."]
//test     }
//test ]);
*/
//test const str_str_bool_fxs = array_map (jsc.literal) ([
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

//test const str_num_fxs = array_map (jsc.literal) ([
//test     prop ("length"),
//test     function (str) {
//test         return str.codePointAt(0);
//test     },
//test     function (str) {
//test         return str.split("\n").length;
//test     }
//test ]);

//test const str_num_str_list = [
//test     function (s) {
//test         return function (len) {
//test             return string_reverse(s.substring(0, len));
//test         };
//test     },
//test     function string_repeat (str) {
//test         return function (count) {
//test             return str.repeat(count);
//test         };
//test     },
//test     function string_left (str) {
//test         return function (pos) {
//test             return str.slice(0, pos);
//test         };
//test     },
//test     function multibang (str) {
//test         return function (n) {
//test             return str + "!".repeat(n);
//test         };
//test     }
//test ];

//test const str_num_str_fxs = array_map (jsc.literal) (str_num_str_list);

//test const chainer = function (fabc) {
//test     return pipeN (
//test         flip (fabc),
//test         create,
//test         jsc.literal
//test     );
//test };

//test const num_str_str_chainers = array_map (
//test     chainer
//test ) (
//test     str_num_str_list
//test );


//test const num_num_list = [
//test     add (10),
//test     exponent (2),
//test     multiply (3),
//test     multiply (-1),
//test     Math.floor
//test ];

//test const num_num_fxs = array_map (jsc.literal) (num_num_list);

//test const num_bool_fxs = array_map (jsc.literal) ([
//test     function (x) {
//test         return (x % 2 === 0);
//test     },
//test     lte (10)
//test ]);

//test const predicate = function (verdict) {
//test     return function ({left, right, compare_with, input}) {
//test         if (input === undefined) {
//test             return;
//test         }
//test
//test         if (type_check ("function") (input)) {
//test             input = input ();
//test         }
//test
//test         const callback = function (value, ignore) {
//test             if (Array.isArray(value)) {
//test                 verdict (compare_with (value[0]) (value[1]));
//test             }
//test         };
//test
//test         parseq.parallel () ([left, right]) (callback) (input);
//test     };
//test };

//test const test_requestor = function ({
//test     fail_rate = 0.5,
//test     delay_min = 0,
//test     delay_max = 1000
//test }) {
//test     return function (unary) {
//test         return function requestor (callback) {
//test             return function (value) {
//test                 const fail_value = Math.random();
//test                 const delay = Math.floor(
//test                     Math.random() * (delay_max - delay_min)
//test                 ) + delay_min;
//test
//test                 if (fail_value < fail_rate) {
//test                     callback (undefined, "failed with " + fail_value);
//test                 } else {
//test                     setTimeout (callback, delay, unary (value));
//test                 }
//test             };
//test         };
//test     };
//test };

//test const requestors_3000 = test_requestor({
//test     delay_max: 3000,
//test     fail_rate: 0.05
//test });

//test const test_roster = adtTests ({
//test     functor: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(str_str_fxs)),
//test             f: jsc.wun_of(num_bool_fxs),
//test             g: jsc.wun_of(str_num_fxs)
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     apply: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(str_num_fxs)),
//test             u: compose (requestors_3000) (jsc.wun_of(str_num_str_fxs)),
//test             v: compose (requestors_3000) (jsc.wun_of(str_num_str_fxs))
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     applicative: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(str_num_fxs)),
//test             f: jsc.wun_of(num_num_fxs),
//test             u: compose (requestors_3000) (jsc.wun_of(str_num_str_fxs)),
//test             x: jsc.integer()
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     chain: {
//test         T: requestorT,
//test         signature: [{
//test             f: jsc.wun_of(num_str_str_chainers),
//test             g: jsc.wun_of(num_str_str_chainers),
//test             u: compose (requestors_3000) (jsc.wun_of(str_num_fxs))
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     monad: {
//test         T: requestorT,
//test         signature: [{
//test             a: jsc.integer(),
//test             f: jsc.wun_of(num_str_str_chainers),
//test             u: compose (requestors_3000) (jsc.wun_of(str_num_fxs))
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     profunctor: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(num_num_fxs)),
//test             f: jsc.wun_of(num_num_fxs),
//test             g: jsc.wun_of(str_num_fxs),
//test             h: jsc.wun_of(num_num_fxs),
//test             i: jsc.wun_of(num_num_fxs)
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     semigroupoid: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(num_num_fxs)),
//test             b: compose (requestors_3000) (jsc.wun_of(str_num_fxs)),
//test             c: compose (requestors_3000) (jsc.wun_of(str_str_fxs))
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     category: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(str_str_fxs))
//test         }],
//test         compare_with: equals,
//test         input: jsc.string(),
//test         predicate
//test     },
//test     contravariant: {
//test         T: requestorT,
//test         signature: [{
//test             a: compose (requestors_3000) (jsc.wun_of(str_num_fxs)),
//test             f: jsc.wun_of(str_str_fxs),
//test             g: jsc.wun_of(str_str_fxs)
//test         }],
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