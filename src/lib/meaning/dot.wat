;; Search by meaning: the query's similarity to every stored vector, as int8 dot products.
;; scores(vecs, n, dims, query, out): out[i] = Σ_j vecs[i·dims + j] · query[j], for i < n.
;; Vectors and query are signed bytes; dims is a multiple of 16. Each step takes 16 bytes of both,
;; widens them to 16 bits and lets i32x4.dot_i16x8_s do the multiply-adds, 8 per instruction.
;; (127 · 127 · 2 fits easily in 32 bits, and so does a sum over 384 dimensions.)
;; Compiled by scripts/build-wasm.ts into dot.wasm.ts.
(module
  (memory (export "memory") 1)
  (func (export "scores") (param $vecs i32) (param $n i32) (param $dims i32) (param $q i32) (param $out i32)
    (local $i i32) (local $j i32) (local $row i32) (local $acc v128) (local $a v128) (local $b v128)
    (local.set $row (local.get $vecs))
    (block $done
      (loop $rows
        (br_if $done (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $acc (v128.const i32x4 0 0 0 0))
        (local.set $j (i32.const 0))
        (block $rowDone
          (loop $cols
            (br_if $rowDone (i32.ge_u (local.get $j) (local.get $dims)))
            (local.set $a (v128.load (i32.add (local.get $row) (local.get $j))))
            (local.set $b (v128.load (i32.add (local.get $q) (local.get $j))))
            (local.set $acc
              (i32x4.add (local.get $acc)
                (i32x4.dot_i16x8_s (i16x8.extend_low_i8x16_s (local.get $a)) (i16x8.extend_low_i8x16_s (local.get $b)))))
            (local.set $acc
              (i32x4.add (local.get $acc)
                (i32x4.dot_i16x8_s (i16x8.extend_high_i8x16_s (local.get $a)) (i16x8.extend_high_i8x16_s (local.get $b)))))
            (local.set $j (i32.add (local.get $j) (i32.const 16)))
            (br $cols)))
        (i32.store
          (i32.add (local.get $out) (i32.shl (local.get $i) (i32.const 2)))
          (i32.add
            (i32.add (i32x4.extract_lane 0 (local.get $acc)) (i32x4.extract_lane 1 (local.get $acc)))
            (i32.add (i32x4.extract_lane 2 (local.get $acc)) (i32x4.extract_lane 3 (local.get $acc)))))
        (local.set $row (i32.add (local.get $row) (local.get $dims)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $rows)))))
