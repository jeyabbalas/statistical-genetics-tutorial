/* Widget "Manhattan plot explorer" (page: the-data).
   Simulated genome-wide summary statistics for one quantitative trait (LDL cholesterol, standardized to SD units)
   in a simulated study of N = 50,000 people, drawn on the real GRCh37 lengths of chromosomes 1-22
   (Ensembl GRCh37 /info/assembly). Association peaks sit at 14 real LDL-cholesterol loci; the gene coordinates in
   the regional view are real (Ensembl GRCh37; current HGNC symbols from Ensembl 116; ABO, ENSG00000175164, is added
   by hand because the GRCh37 annotation lists it as "processed_transcript", although it is protein-coding in current
   releases). Every variant ID, allele,
   frequency and statistic is simulated.
   Model
   - Background: 5,000,000 tested variants with no effect, z ~ N(0, 1). To keep drawing fast, the widget keeps every
     variant with p < 0.01 (|z| > 2.5758, sampled exactly from the normal tail with Marsaglia's method) and a random
     1 in 150 of the others. Each kept point carries a weight (1, or about 150), so the QQ plot and lambda describe all
     5,000,000 tests.
   - Each association region: about 400 variants within +/-400 kb of a lead (causal) variant, with a simulated signed
     LD correlation r_j with the lead (decays with distance and across simulated recombination hotspots);
     z_j | z_lead ~ N(r_j z_lead, 1 - r_j^2).
   - Row in REGENIE format: SE = 1 / sqrt(2 f (1 - f) N) for a standardized trait, BETA = z SE, CHISQ = z^2,
     LOG10P = -log10(2 Phi(-|z|)), computed in log space so that tiny p-values do not underflow.
   - "Uncorrected stratification": every chi-square statistic is multiplied by c = 1.15 (z -> z sqrt(c)).
   - Genomic inflation factor lambda = (weighted) median chi-square / 0.4549364 (median of chi-square with 1 df).
   No libraries, no network, no modules: works from file://. Core functions are exported for node tests. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ constants and real locus data */
  var CHR_LEN = [249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663, 146364022,
    141213431, 135534747, 135006516, 133851895, 115169878, 107349540, 102531392, 90354753, 81195210, 78077248,
    59128983, 63025520, 48129895, 51304566];                      // GRCh37, chromosomes 1-22 (Ensembl)
  var N_STUDY = 50000;
  var M_BG = 5000000;
  var P_TOP = 0.01;
  var Z_TOP = 2.5758293035489004;                                  // |z| for a two-sided p of 0.01
  var THIN = 150;
  var HALF_WIN = 400000;
  var GWS = -Math.log10(5e-8);                                     // 7.30103
  var CHI2_MEDIAN = 0.4549364231195724;                            // median of chi-square, 1 df
  var INFLATE = 1.15;
  var BASES = "ACGT";
  var DEFAULT_SEED = 20261053;

  /* label = short label on the plot; full = text in the readout; z = expected |z| of the lead variant */
  var LOCUS_META = {
    "CELSR2/SORT1": { label: "SORT1", full: "CELSR2 / PSRC1 / SORT1", z: 12.5 },
    "PCSK9": { label: "PCSK9", full: "PCSK9", z: 10.2 },
    "ANGPTL3": { label: "ANGPTL3", full: "ANGPTL3", z: 4.9 },
    "APOB": { label: "APOB", full: "APOB", z: 10.8 },
    "ABCG5/ABCG8": { label: "ABCG5/8", full: "ABCG5 / ABCG8", z: 8.2 },
    "HMGCR": { label: "HMGCR", full: "HMGCR", z: 8.8 },
    "TIMD4": { label: "TIMD4", full: "TIMD4 / HAVCR1", z: 6.2 },
    "LPA": { label: "LPA", full: "LPA", z: 9.4 },
    "TRIB1": { label: "TRIB1", full: "TRIB1", z: 6.0 },
    "ABO": { label: "ABO", full: "ABO", z: 7.2 },
    "HNF1A": { label: "HNF1A", full: "HNF1A", z: 6.6 },
    "LDLR": { label: "LDLR", full: "LDLR", z: 11.6 },
    "TM6SF2": { label: "TM6SF2", full: "TM6SF2 / SUGP1", z: 7.6 },
    "APOE": { label: "APOE", full: "APOE / APOC1 / TOMM40", z: 14.5 }
  };
  var LOCI = [
    { name: "CELSR2/SORT1", chr: 1, lead: 109816120, genes: [[109358520,109506106,-1,"AKNAD1"],[109417972,109477167,1,"GPSM2"],[109472130,109506111,-1,"CLCC1"],[109512836,109584850,-1,"WDR47"],[109605108,109618624,-1,"TAF13"],[109632425,109639556,1,"TMEM167B"],[109648573,109656479,-1,"CFAP276"],[109656301,109749401,1,"ELAPOR1"],[109756540,109780791,1,"SARS1"],[109792641,109818372,1,"CELSR2"],[109822178,109825808,-1,"PSRC1"],[109834987,109849663,-1,"MYBPHL"],[109852192,109940573,-1,"SORT1"],[109941653,109969062,-1,"PSMA5"],[110009180,110024759,1,"SYPL2"],[110026101,110035426,1,"ATXN7L2"],[110036674,110045554,1,"CYB561D1"],[110046797,110052360,-1,"AMIGO1"],[110082494,110091028,1,"GPR61"],[110091233,110136975,1,"GNAI3"],[110145889,110155679,-1,"GNAT2"],[110158726,110174673,1,"AMPD2"],[110198703,110208118,1,"GSTM4"],[110210644,110252171,1,"GSTM2"]] },
    { name: "PCSK9", chr: 1, lead: 55521840, genes: [[55107463,55175939,1,"MROH7"],[55181495,55208330,1,"TTC4"],[55222571,55230187,-1,"PARS2"],[55245385,55266940,-1,"TTC22"],[55271736,55307925,1,"CIMAP2"],[55315306,55352891,-1,"DHCR24"],[55446465,55457966,1,"TMEM61"],[55464606,55476556,1,"BSND"],[55505221,55530525,1,"PCSK9"],[55532032,55680786,-1,"USP24"]] },
    { name: "ANGPTL3", chr: 1, lead: 63068950, genes: [[62660503,62678000,1,"L1TD1"],[62702651,62785085,-1,"KANK4"],[62901968,62917475,1,"USP1"],[62920399,63153969,-1,"DOCK7"],[63063158,63071830,1,"ANGPTL3"],[63249806,63331184,1,"ATG4C"]] },
    { name: "APOB", chr: 2, lead: 21262410, genes: [[20866424,20873418,1,"GDF7"],[20883788,21022882,-1,"LDAH"],[21224301,21266945,-1,"APOB"],[21346789,21366144,1,"TDRD15"]] },
    { name: "ABCG5/ABCG8", chr: 2, lead: 44072530, genes: [[43393800,43823185,-1,"THADA"],[43864412,43995126,1,"PLEKHH2"],[44001178,44037149,1,"DYNC2LI1"],[44039611,44066004,-1,"ABCG5"],[44066103,44105605,1,"ABCG8"],[44113647,44223144,-1,"LRPPRC"],[44395108,44471523,1,"PPM1B"]] },
    { name: "HMGCR", chr: 5, lead: 74648320, genes: [[74323289,74326724,-1,"GCNT4"],[74364100,74532703,-1,"ANKRD31"],[74632154,74657929,1,"HMGCR"],[74664311,74807963,-1,"CERT1"],[74807581,74896969,1,"POLK"],[74907284,74967671,1,"ANKDD1B"],[74969949,75013313,-1,"POC5"]] },
    { name: "TIMD4", chr: 5, lead: 156389140, genes: [[155297354,156194799,1,"SGCD"],[156346293,156390266,-1,"TIMD4"],[156456424,156486130,-1,"HAVCR1"],[156512843,156569880,-1,"HAVCR2"],[156564423,156586030,-1,"MED7"],[156569944,156682201,1,"ITK"],[156588857,156593275,-1,"GARIN3"],[156693089,156822606,1,"CYFIP2"],[156768608,156772729,-1,"FNDC9"]] },
    { name: "LPA", chr: 6, lead: 161005880, genes: [[160592093,160698670,-1,"SLC22A2"],[160769300,160876014,1,"SLC22A3"],[160952515,161087407,-1,"LPA"],[161123270,161174347,1,"PLG"]] },
    { name: "TRIB1", chr: 8, lead: 126490970, genes: [[126036502,126104082,-1,"WASHC5"],[126103921,126379362,1,"NSMCE2"],[126442563,126450647,1,"TRIB1"]] },
    { name: "ABO", chr: 9, lead: 136149880, genes: [[135600965,135754164,-1,"AK8"],[135753414,135765588,1,"SPACA9"],[135766735,135820020,-1,"TSC1"],[135820932,135867083,1,"GFI1B"],[135906076,135933890,1,"GTF3C5"],[135937365,135947248,1,"CEL"],[135973107,136039301,-1,"RALGDS"],[136028340,136039332,-1,"GBGT1"],[136080664,136084630,-1,"OBP2B"],[136125788,136150617,-1,"ABO"],[136197552,136203235,-1,"SURF6"],[136205160,136214986,-1,"MED22"],[136215069,136218281,1,"RPL7A"],[136218610,136223552,-1,"SURF1"],[136223428,136228045,1,"SURF2"],[136228325,136242970,-1,"SURF4"],[136243117,136271220,1,"STKLD1"],[136271186,136283164,-1,"REXO4"],[136279478,136324508,1,"ADAMTS13"],[136325089,136335970,1,"CACFD1"],[136336217,136344259,-1,"SLC2A6"],[136379708,136393734,-1,"MYMK"],[136397286,136440641,1,"ADAMTSL2"],[136444079,136451319,-1,"FAM163B"],[136501482,136524466,1,"DBH"],[136528682,136605077,-1,"SARDH"]] },
    { name: "HNF1A", chr: 12, lead: 121420810, genes: [[121078355,121105127,1,"CABP1"],[121124672,121139667,1,"MLEC"],[121148238,121161443,1,"UNC119B"],[121163538,121177811,1,"ACADS"],[121200313,121342174,-1,"SPPL3"],[121416346,121440315,1,"HNF1A"],[121440225,121454305,-1,"C12orf43"],[121458095,121477045,-1,"OASL"],[121570622,121623876,1,"P2RX7"],[121647660,121671909,1,"P2RX4"],[121675497,121736111,-1,"CAMKK2"],[121746048,121837699,-1,"ANAPC5"]] },
    { name: "LDLR", chr: 19, lead: 11202980, genes: [[10764937,10803093,1,"ILF3"],[10812106,10824113,1,"QTRT1"],[10828755,10944164,1,"DNM2"],[10943114,10946994,-1,"TMED1"],[10947251,10980466,1,"C19orf38"],[10982189,11033453,1,"CARM1"],[11033444,11039357,-1,"YIPF2"],[11039409,11044211,1,"TIMM29"],[11071598,11176071,1,"SMARCA4"],[11200038,11244492,1,"LDLR"],[11242196,11266484,-1,"SPC24"],[11274943,11308467,-1,"KANK2"],[11309971,11373157,-1,"DOCK6"],[11348178,11352619,1,"ANGPTL8"],[11406824,11437672,1,"TSPAN16"],[11432722,11456946,-1,"RAB3D"],[11453452,11457194,-1,"TMEM205"],[11455360,11465620,1,"CCDC159"],[11466062,11476374,1,"PLPPR2"],[11485361,11487627,1,"SWSAP1"],[11488236,11495018,-1,"EPOR"],[11495017,11530018,-1,"RGL3"],[11531272,11546603,-1,"ODAD3"],[11546109,11561783,1,"PRKCSH"],[11562141,11591861,-1,"ELAVL3"],[11594242,11616738,-1,"ZNF653"]] },
    { name: "TM6SF2", chr: 19, lead: 19380120, genes: [[18979361,19006905,-1,"GDF1"],[18979361,19007536,-1,"CERS1"],[19010323,19030206,-1,"COPE"],[19030484,19039436,1,"DDX49"],[19040010,19052070,-1,"HOMER3"],[19101697,19144832,-1,"SUGP2"],[19144384,19170563,1,"ARMC6"],[19174808,19223697,1,"SLC25A42"],[19229978,19249322,-1,"TMEM161A"],[19256377,19303400,-1,"MEF2B"],[19287712,19303400,-1,"BORCS8"],[19303008,19312678,1,"RFXANK"],[19312225,19314233,-1,"NR2C2AP"],[19322782,19363042,1,"NCAN"],[19366450,19373605,-1,"HAPLN4"],[19375173,19384200,-1,"TM6SF2"],[19386827,19431653,-1,"SUGP1"],[19431490,19469563,1,"MAU2"],[19496635,19619740,1,"GATAD2A"],[19623227,19626838,-1,"TSSK6"],[19626545,19644285,1,"NDUFA13"],[19627036,19648390,1,"YJEFN3"],[19649057,19657468,1,"CILP2"],[19672522,19729725,-1,"PBX4"],[19734477,19739739,-1,"LPAR2"],[19740285,19754476,-1,"GMIP"],[19756007,19774502,-1,"ATP13A1"],[19779605,19794318,1,"ZNF101"]] },
    { name: "APOE", chr: 19, lead: 45411250, genes: [[45116940,45140081,1,"IGSF23"],[45147098,45166850,1,"PVR"],[45165545,45187631,1,"CEACAM19"],[45202421,45213986,1,"CEACAM16"],[45250962,45263301,1,"BCL3"],[45281126,45303891,1,"CBLC"],[45312328,45324673,1,"BCAM"],[45349432,45392485,1,"NECTIN2"],[45393826,45406946,1,"TOMM40"],[45409011,45412650,1,"APOE"],[45417504,45422606,1,"APOC1"],[45445495,45452820,1,"APOC4"],[45449243,45452822,1,"APOC2"],[45457842,45496599,1,"CLPTM1"],[45504688,45541452,1,"RELB"],[45542298,45574214,1,"CLASRP"],[45574758,45579846,-1,"ZNF296"],[45582453,45594782,1,"GEMIN7"],[45582546,45808541,1,"MARK4"],[45594654,45651335,1,"PPP1R37"],[45653008,45663408,-1,"NKPD1"],[45666186,45681495,-1,"TRAPPC6A"],[45682003,45685059,1,"BLOC1S3"],[45715879,45737469,-1,"EXOC3L2"],[45809672,45826235,-1,"CKM"]] }
  ];

  /* ------------------------------------------------------------------ random numbers */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var u = mulberry32(seed >>> 0), spare = null;
    function unif() { var x = u(); return x > 0 ? x : 2.3283064365386963e-10; }
    function normal() {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var r = Math.sqrt(-2 * Math.log(unif())), th = 2 * Math.PI * u();
      spare = r * Math.sin(th);
      return r * Math.cos(th);
    }
    /* N(0,1) conditioned on X > a (a > 0): Marsaglia's tail method. */
    function tail(a) {
      for (;;) {
        var x = Math.sqrt(a * a - 2 * Math.log(unif()));
        if (u() * x <= a) return x;
      }
    }
    return { u: u, unif: unif, normal: normal, tail: tail };
  }

  /* ------------------------------------------------------------------ statistics */
  /* Inverse of the standard normal CDF (P. J. Acklam's rational approximation, relative error < 1.2e-9). */
  function qnorm(p) {
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    var q, r;
    if (p < 0.02425 || p > 0.97575) {
      q = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
      r = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      return p < 0.5 ? r : -r;
    }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  /* erfc with fractional error < 1.2e-7 (Numerical Recipes, erfcc). */
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 +
      t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  /* Natural log of the two-sided p-value of a z statistic, ln(2 Phi(-|z|)), accurate far into the tail. */
  function lnP2(z) {
    var x = Math.abs(z);
    if (x < 7) return Math.log(erfc(x / Math.SQRT2));
    var t = x;                                                   // Mills ratio, backward continued fraction
    for (var k = 80; k >= 1; k--) t = x + k / t;
    return Math.LN2 - 0.5 * x * x - 0.9189385332046728 - Math.log(t);
  }
  /* LOG10P as written by REGENIE: -log10(p). */
  function log10P(z) { return -lnP2(z) / Math.LN10; }

  var SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function sup(n) { return String(n).split("").map(function (c) { return SUP[c] || c; }).join(""); }
  /* p-value text from LOG10P, e.g. 7.9 x 10^-36 */
  function fmtP(lp) {
    if (lp < 3) return Math.pow(10, -lp).toPrecision(2);
    var e = Math.floor(-lp), m = Math.pow(10, -lp - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10" + sup(e);
  }
  /* Numbers as C++ streams print them by default (6 significant digits), as in REGENIE output. */
  function g6(v) {
    if (!isFinite(v)) return "NA";
    if (v === 0) return "0";
    var a = Math.abs(v), s;
    if (a >= 1e-4 && a < 1e6) {
      s = v.toPrecision(6);
      if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
      return s;
    }
    s = v.toExponential(5).replace(/\.?0+e/, "e");
    return s.replace(/e([+-])(\d)$/, "e$10$2");
  }

  /* ------------------------------------------------------------------ simulation */
  function genomeOffsets() {
    var off = [], tot = 0;
    for (var c = 0; c < CHR_LEN.length; c++) { off.push(tot); tot += CHR_LEN[c]; }
    return { off: off, tot: tot };
  }

  function simulate(seed) {
    var R = makeRng(seed);
    var G = genomeOffsets();
    var loci = LOCI.map(function (L) {
      var meta = LOCUS_META[L.name] || { label: L.name, full: L.name, z: 8 };
      return { name: L.name, label: meta.label, full: meta.full, zExp: meta.z, chr: L.chr, lead: L.lead,
        genes: L.genes, idx: [], byPos: [], byR2: [], leadIdx: -1 };
    });

    var K = Math.round(M_BG * P_TOP + Math.sqrt(M_BG * P_TOP * (1 - P_TOP)) * R.normal());
    var B = Math.round((M_BG - K) / THIN);
    var wThin = (M_BG - K) / B;

    /* regional variants first (positions, LD), so their total size is known */
    var regional = [];
    loci.forEach(function (L, li) {
      var nr = 360 + Math.floor(R.u() * 100);
      var lo = L.lead - HALF_WIN, hi = L.lead + HALF_WIN;
      var seen = {}; seen[L.lead] = 1;
      var pos = [L.lead];
      while (pos.length < nr) {
        var p = lo + Math.floor(R.u() * (hi - lo + 1));
        if (!seen[p]) { seen[p] = 1; pos.push(p); }
      }
      pos.sort(function (a, b) { return a - b; });
      var bnd = [], fac = [], x = lo;                             // simulated recombination hotspots
      for (;;) {
        x += -Math.log(R.unif()) * 45000;
        if (x >= hi) break;
        bnd.push(x); fac.push(0.08 + 0.42 * R.u());
      }
      var zLead = (R.u() < 0.5 ? -1 : 1) * Math.max(3, L.zExp + 0.6 * R.normal());
      var fLead = 0.08 + 0.84 * R.u();
      for (var j = 0; j < pos.length; j++) {
        var isLead = pos[j] === L.lead, r2, r, z, f;
        if (isLead) { r2 = 1; z = zLead; f = fLead; }
        else {
          var d = Math.abs(pos[j] - L.lead), a = Math.min(pos[j], L.lead), b = Math.max(pos[j], L.lead), prod = 1;
          for (var k = 0; k < bnd.length; k++) if (bnd[k] > a && bnd[k] < b) prod *= fac[k];
          var v = R.u() < 0.5 ? 0.55 + 0.45 * R.u() : 0.55 * R.u();
          r2 = Math.min(0.98, Math.exp(-d / 35000) * prod * v);
          r = Math.sqrt(r2) * (R.u() < 0.85 ? 1 : -1);
          z = r * zLead + Math.sqrt(1 - r2) * R.normal();
          var cap = Math.abs(zLead) - 0.05 - 0.3 * R.u();
          if (Math.abs(z) > cap) z = (z < 0 ? -1 : 1) * cap;
          f = r2 > 0.5 ? Math.min(0.97, Math.max(0.03, fLead + (R.u() - 0.5) * 0.08)) : randFreq(R);
        }
        regional.push({ li: li, pos: pos[j], z: z, r2: r2, f: f, lead: isLead });
      }
    });

    var n = B + K + regional.length;
    var D = {
      seed: seed, n: n, B: B, K: K, wThin: wThin, loci: loci, off: G.off, tot: G.tot,
      chr: new Uint8Array(n), pos: new Uint32Array(n), z: new Float32Array(n), freq: new Float32Array(n),
      info: new Float32Array(n), a0: new Uint8Array(n), a1: new Uint8Array(n), w: new Float32Array(n),
      loc: new Int8Array(n), r2: new Float32Array(n), lp: new Float32Array(n), mTotal: M_BG + regional.length
    };
    var i = 0;
    function background(zval, weight) {
      var c, p;
      for (;;) {
        var g = Math.floor(R.u() * G.tot);
        c = 0; while (c < 21 && g >= G.off[c + 1]) c++;
        p = g - G.off[c] + 1;
        var bad = false;
        for (var q = 0; q < loci.length; q++) {
          if (loci[q].chr === c + 1 && Math.abs(p - loci[q].lead) <= HALF_WIN + 20000) { bad = true; break; }
        }
        if (!bad) break;
      }
      D.chr[i] = c + 1; D.pos[i] = p; D.z[i] = zval; D.w[i] = weight; D.loc[i] = -1; D.r2[i] = NaN;
      D.freq[i] = randFreq(R); D.info[i] = 1 - 0.2 * Math.pow(R.u(), 2.5); setAlleles(i);
      i++;
    }
    function setAlleles(k) {
      var x = Math.floor(R.u() * 4);
      D.a0[k] = x; D.a1[k] = (x + 1 + Math.floor(R.u() * 3)) % 4;
    }
    /* Thinned background, |z| < 2.5758. Stratified draws of |z| (one per 1/B slice of its distribution) make the
       kept points an almost exact miniature of the 5,000,000 null tests, so lambda is not distorted by the thinning. */
    for (var b = 0; b < B; b++) {
      var ub = (b + R.u()) / B;
      background((R.u() < 0.5 ? -1 : 1) * qnorm(0.5 + 0.5 * ub * (1 - P_TOP)), wThin);
    }
    for (var t = 0; t < K; t++) background((R.u() < 0.5 ? -1 : 1) * R.tail(Z_TOP), 1);  // every p < 0.01
    regional.forEach(function (v) {
      D.chr[i] = loci[v.li].chr; D.pos[i] = v.pos; D.z[i] = v.z; D.w[i] = 1; D.loc[i] = v.li; D.r2[i] = v.r2;
      D.freq[i] = v.f; D.info[i] = v.lead ? 0.995 : 1 - 0.15 * Math.pow(R.u(), 2.5); setAlleles(i);
      loci[v.li].idx.push(i);
      if (v.lead) loci[v.li].leadIdx = i;
      i++;
    });
    loci.forEach(function (L) {
      L.byPos = L.idx.slice().sort(function (a, b) { return D.pos[a] - D.pos[b]; });
      L.byR2 = L.idx.slice().sort(function (a, b) { return D.r2[a] - D.r2[b]; });
    });
    /* QQ order (largest |z| first) and expected -log10 p for every kept point, using the weights */
    var order = new Uint32Array(n);
    for (var o = 0; o < n; o++) order[o] = o;
    var absz = new Float32Array(n);
    for (var a = 0; a < n; a++) absz[a] = Math.abs(D.z[a]);
    order.sort(function (x, y) { return absz[y] - absz[x]; });
    var expLp = new Float32Array(n), cum = 0, medIdx = -1, half = D.mTotal / 2;
    for (var r = 0; r < n; r++) {
      var id = order[r], wt = D.w[id];
      expLp[r] = -Math.log10((cum + wt / 2) / D.mTotal);
      cum += wt;
      if (medIdx < 0 && cum >= half) medIdx = id;
    }
    D.order = order; D.expLp = expLp; D.medIdx = medIdx;
    return D;
  }
  function randFreq(R) {
    var m = 0.005 + 0.495 * Math.pow(R.u(), 1.5);
    return R.u() < 0.5 ? m : 1 - m;
  }
  /* Recompute LOG10P for an inflation factor c (1 = none); returns lambda. */
  function applyInflation(D, c) {
    var s = Math.sqrt(c);
    for (var i = 0; i < D.n; i++) D.lp[i] = log10P(D.z[i] * s);
    var zm = D.z[D.medIdx];
    return c * zm * zm / CHI2_MEDIAN;
  }
  function variantId(D, i) { return D.chr[i] + ":" + D.pos[i] + "_" + BASES[D.a0[i]] + "_" + BASES[D.a1[i]]; }
  /* One output row with REGENIE's column names. */
  function regenieRow(D, i, c) {
    var f = D.freq[i], z = D.z[i] * Math.sqrt(c || 1);
    var se = 1 / Math.sqrt(2 * f * (1 - f) * N_STUDY);
    return {
      CHROM: String(D.chr[i]), GENPOS: String(D.pos[i]), ID: variantId(D, i), ALLELE0: BASES[D.a0[i]],
      ALLELE1: BASES[D.a1[i]], A1FREQ: g6(f), INFO: g6(D.info[i]), N: String(N_STUDY), TEST: "ADD",
      BETA: g6(z * se), SE: g6(se), CHISQ: g6(z * z), LOG10P: g6(log10P(z)), EXTRA: "NA"
    };
  }
  var COLS = ["CHROM", "GENPOS", "ID", "ALLELE0", "ALLELE1", "A1FREQ", "INFO", "N", "TEST", "BETA", "SE", "CHISQ",
    "LOG10P", "EXTRA"];

  var core = { CHR_LEN: CHR_LEN, LOCI: LOCI, LOCUS_META: LOCUS_META, simulate: simulate, applyInflation: applyInflation,
    log10P: log10P, lnP2: lnP2, erfc: erfc, qnorm: qnorm, makeRng: makeRng, g6: g6, fmtP: fmtP, regenieRow: regenieRow,
    variantId: variantId, GWS: GWS, CHI2_MEDIAN: CHI2_MEDIAN, M_BG: M_BG, THIN: THIN, N_STUDY: N_STUDY,
    DEFAULT_SEED: DEFAULT_SEED, INFLATE: INFLATE, HALF_WIN: HALF_WIN };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ user interface */
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function init() {
    var root = document.getElementById("w-manhattan");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;

    var C = {
      odd: cssVar("--q1", "#4e79a7"), even: cssVar("--fg-faint", "#8a93a0"), fg: cssVar("--fg", "#1d2127"),
      muted: cssVar("--fg-muted", "#5a6370"), grid: cssVar("--border", "#d9dee5"), thr: cssVar("--q4", "#e15759"),
      accent: cssVar("--accent", "#0a62c2"), lead: cssVar("--mm", "#4c3fb0"), font: cssVar("--font", "sans-serif"),
      ld: [cssVar("--pat", "#4a62c9"), cssVar("--q5", "#76b7b2"), cssVar("--q3", "#59a14f"), cssVar("--q2", "#f28e2b"),
        cssVar("--q4", "#e15759")]
    };
    var LD_LABELS = ["< 0.2", "0.2–0.4", "0.4–0.6", "0.6–0.8", "≥ 0.8"];

    body.innerHTML = "";
    body.appendChild(el("p", { "class": "mh-banner" }, "<strong>Simulated values at real gene locations.</strong> " +
      "Positions are on GRCh37 (the build of UK Biobank’s array and imputed genotypes), chromosomes 1–22. " +
      "The labeled loci and the genes in the regional view are real; every variant ID, allele and statistic is simulated " +
      "(a GWAS of standardized LDL cholesterol in 50,000 simulated people, 5,000,000 variants tested). To draw quickly, the plot shows every variant " +
      "with p &lt; 0.01 and a random 1 in 150 of the others."));
    var controls = el("div", { "class": "controls mh-controls" });
    var selLab = el("label", null, "Region ");
    var sel = el("select", { "aria-label": "Choose a region to zoom into" });
    selLab.appendChild(sel);
    var back = el("button", { "class": "btn", type: "button" }, "← Genome-wide view");
    var inflLab = el("label", { "class": "mh-check" });
    var infl = el("input", { type: "checkbox" });
    inflLab.appendChild(infl);
    inflLab.appendChild(document.createTextNode(" Uncorrected stratification (every χ² × 1.15)"));
    var resample = el("button", { "class": "btn", type: "button" }, "Re-sample");
    controls.appendChild(selLab); controls.appendChild(back); controls.appendChild(inflLab); controls.appendChild(resample);
    body.appendChild(controls);

    var title = el("div", { "class": "mh-title" });
    body.appendChild(title);
    var plotWrap = el("div", { "class": "mh-plot" });
    var base = el("canvas", { "class": "mh-base", "aria-hidden": "true" });
    var over = el("canvas", { "class": "mh-over", tabindex: "0", role: "img" });
    plotWrap.appendChild(base); plotWrap.appendChild(over);
    body.appendChild(plotWrap);
    body.appendChild(el("p", { "class": "note mh-keys" }, "Hover or tap a point to see its row. Click or tap a peak to zoom into its region. " +
      "Keyboard (Tab to the plot or click it): ← → step between peaks or variants, Enter zooms in, Esc goes back."));

    var lower = el("div", { "class": "mh-lower" });
    var readout = el("div", { "class": "readout mh-readout", "aria-live": "polite" });
    var side = el("div", { "class": "mh-side" });
    side.appendChild(el("div", { "class": "mh-qq-title" }, "QQ plot of all 5,000,000+ tests"));
    var qq = el("canvas", { "class": "mh-qq", role: "img" });
    side.appendChild(qq);
    var lam = el("div", { "class": "mh-lambda" });
    side.appendChild(lam);
    lower.appendChild(readout); lower.appendChild(side);
    body.appendChild(lower);

    var S = { seed: DEFAULT_SEED, D: null, c: 1, lambda: 1, view: -1, sel: -1, hover: -1, pts: null, grid: null,
      W: 0, H: 0, dpr: 1, layout: null, peakKey: 0, regKey: 0 };

    function fillSelect() {
      sel.innerHTML = "";
      sel.appendChild(el("option", { value: "-1" }, "Genome-wide view"));
      S.D.loci.slice().map(function (L, i) { return { L: L, i: i }; })
        .sort(function (a, b) { return a.L.chr - b.L.chr || a.L.lead - b.L.lead; })
        .forEach(function (o) {
          sel.appendChild(el("option", { value: String(o.i) }, "chr" + o.L.chr + " · " + o.L.full));
        });
      sel.value = String(S.view);
    }
    function lociSorted() {
      return S.D.loci.map(function (L, i) { return i; })
        .sort(function (a, b) { return S.D.loci[a].chr - S.D.loci[b].chr || S.D.loci[a].lead - S.D.loci[b].lead; });
    }

    function regenerate() {
      S.D = simulate(S.seed);
      S.lambda = applyInflation(S.D, S.c);
      fillSelect();
      if (S.view >= 0) S.sel = S.D.loci[S.view].leadIdx;
      else S.sel = S.D.loci[topLocus()].leadIdx;
      render();
    }
    function topLocus() {
      var best = 0;
      S.D.loci.forEach(function (L, i) { if (S.D.lp[L.leadIdx] > S.D.lp[S.D.loci[best].leadIdx]) best = i; });
      return best;
    }

    /* ---------------- sizing */
    function size() {
      var w = Math.max(280, Math.floor(plotWrap.clientWidth));
      var h = S.view < 0 ? Math.round(Math.min(380, Math.max(250, w * 0.42))) : (w < 560 ? 410 : Math.round(Math.min(420, Math.max(330, w * 0.5))));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      [base, over].forEach(function (cv) {
        cv.style.width = w + "px"; cv.style.height = h + "px";
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      });
      plotWrap.style.height = h + "px";
      S.W = w; S.H = h; S.dpr = dpr;
      var qs = Math.min(260, Math.max(200, side.clientWidth || 240));
      qq.style.width = qs + "px"; qq.style.height = qs + "px";
      qq.width = Math.round(qs * dpr); qq.height = Math.round(qs * dpr);
      S.qs = qs;
    }

    /* ---------------- drawing helpers */
    function niceStep(max, target) {
      var raw = max / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
      return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
    }
    function yAxis(ctx, L, yMax) {
      var step = niceStep(yMax, 5);
      ctx.font = "11px " + C.font; ctx.fillStyle = C.muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (var v = 0; v <= yMax + 1e-9; v += step) {
        var y = Math.round(L.y(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(L.left - 4, y); ctx.lineTo(L.left, y); ctx.stroke();
        ctx.fillText(String(Math.round(v)), L.left - 6, y);
      }
      ctx.beginPath(); ctx.moveTo(L.left + 0.5, L.top); ctx.lineTo(L.left + 0.5, L.top + L.h); ctx.stroke();
      ctx.save(); ctx.translate(12, L.top + L.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center";
      ctx.fillStyle = C.fg; ctx.fillText("−log₁₀(p)", 0, 0); ctx.restore();
    }
    function threshold(ctx, L) {
      var y = Math.round(L.y(GWS)) + 0.5;
      ctx.save(); ctx.strokeStyle = C.thr; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(L.left + L.w, y); ctx.stroke(); ctx.restore();
      ctx.font = "11px " + C.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      var lab = "p = 5 × 10⁻⁸", tw = ctx.measureText(lab).width;
      ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillRect(L.left + L.w - tw - 5, y - 15, tw + 5, 13);
      ctx.fillStyle = C.thr; ctx.fillText(lab, L.left + L.w - 2, y - 2);
    }

    /* ---------------- genome-wide view */
    function drawGenome() {
      var D = S.D, ctx = base.getContext("2d");
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, S.W, S.H);
      var gap = D.tot * 0.004, totG = D.tot + gap * 21, maxLp = 0;
      for (var q = 0; q < D.n; q++) if (D.lp[q] > maxLp) maxLp = D.lp[q];
      var yMax = Math.max(10, Math.ceil((maxLp + 3) / 5) * 5);
      var L = { left: 44, top: 24, w: S.W - 44 - 8, h: S.H - 24 - 38 };
      L.y = function (v) { return L.top + L.h * (1 - v / yMax); };
      L.x = function (c, p) { return L.left + ((D.off[c - 1] + gap * (c - 1) + p) / totG) * L.w; };
      S.layout = L;
      yAxis(ctx, L, yMax);
      /* chromosome labels */
      ctx.font = "11px " + C.font; ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      var lastRight = -1e9;
      for (var c = 1; c <= 22; c++) {
        var xc = L.x(c, CHR_LEN[c - 1] / 2), lab = String(c), tw = ctx.measureText(lab).width;
        if (xc - tw / 2 > lastRight + 3 || c === 22 && xc - tw / 2 > lastRight + 1) {
          ctx.fillText(lab, xc, L.top + L.h + 5); lastRight = xc + tw / 2;
        }
      }
      ctx.fillStyle = C.fg; ctx.fillText("Chromosome (positions on GRCh37)", L.left + L.w / 2, L.top + L.h + 20);
      /* points */
      var px = new Float32Array(D.n), py = new Float32Array(D.n), r = S.W < 500 ? 1.1 : 1.3;
      for (var i = 0; i < D.n; i++) {
        var x = L.x(D.chr[i], D.pos[i]), y = L.y(D.lp[i]);
        px[i] = x; py[i] = y;
        ctx.fillStyle = D.chr[i] % 2 ? C.odd : C.even;
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      threshold(ctx, L);
      /* peak labels (gene symbols in italics) with simple collision avoidance */
      var labs = [];
      var cand = D.loci.map(function (Lc, li) { return li; }).filter(function (li) { return D.lp[D.loci[li].leadIdx] >= GWS; })
        .sort(function (a, b) { return D.lp[D.loci[b].leadIdx] - D.lp[D.loci[a].leadIdx]; });
      if (S.W < 520) cand = cand.slice(0, 6);
      ctx.font = "italic 11px " + C.font; ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
      cand.forEach(function (li) {
        var Lc = D.loci[li], k = Lc.leadIdx, tx = px[k], ty = py[k] - 7, tw = ctx.measureText(Lc.label).width;
        var x0 = Math.max(L.left + 2, Math.min(L.left + L.w - tw - 2, tx - tw / 2)), yy = Math.max(L.top + 10, ty);
        var tries = 0;
        while (tries++ < 12 && labs.some(function (b) { return x0 < b.x1 + 4 && x0 + tw > b.x0 - 4 && yy > b.y - 12 && yy - 11 < b.y + 1; })) yy -= 12;
        if (yy < 11) return;
        labs.push({ x0: x0, x1: x0 + tw, y: yy });
        if (yy < ty - 2) {
          ctx.strokeStyle = C.muted; ctx.lineWidth = 0.8; ctx.beginPath();
          ctx.moveTo(tx, py[k] - 3); ctx.lineTo(tx, yy + 2); ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(x0 - 1, yy - 10, tw + 2, 12);
        ctx.fillStyle = C.fg; ctx.textAlign = "left"; ctx.fillText(Lc.label, x0, yy);
      });
      buildGrid(px, py, null);
      over.setAttribute("aria-label", "Manhattan plot of simulated summary statistics on chromosomes 1 to 22. " +
        cand.length + " loci reach genome-wide significance. The selected variant is described below the plot.");
      title.innerHTML = "<strong>Genome-wide view</strong> · one point per variant · x = position, y = −log₁₀(p)";
    }

    /* ---------------- regional view */
    function ldBin(r2) { return r2 >= 0.8 ? 4 : r2 >= 0.6 ? 3 : r2 >= 0.4 ? 2 : r2 >= 0.2 ? 1 : 0; }
    function drawRegion(li) {
      var D = S.D, Lc = D.loci[li], ctx = base.getContext("2d");
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, S.W, S.H);
      var lo = Lc.lead - HALF_WIN, hi = Lc.lead + HALF_WIN;
      /* gene rows */
      ctx.font = "italic 11px " + C.font;
      var rows = [], genes = Lc.genes.map(function (g) { return { s: Math.max(lo, g[0]), e: Math.min(hi, g[1]), st: g[2], n: g[3] }; })
        .filter(function (g) { return g.e > g.s; });
      var narrow = S.W < 560;
      var L = { left: 44, top: narrow ? 50 : 30, w: S.W - 44 - 10 };
      var gx = function (p) { return L.left + (p - lo) / (hi - lo) * L.w; };
      var maxRows = S.W < 520 ? 5 : 4;
      genes.forEach(function (g) {
        var x0 = gx(g.s), x1 = gx(g.e), tw = ctx.measureText(g.n).width;
        var mid = Math.max(L.left + tw / 2, Math.min(L.left + L.w - tw / 2, (x0 + x1) / 2));  // as clamped when drawn
        var lx0 = Math.min(x0, mid - tw / 2), lx1 = Math.max(x1, mid + tw / 2);
        var placed = false;
        for (var r = 0; r < rows.length && !placed; r++) {
          if (rows[r] + 6 < lx0) { rows[r] = lx1; g.row = r; g.lab = true; placed = true; }
        }
        if (!placed && rows.length < maxRows) { rows.push(lx1); g.row = rows.length - 1; g.lab = true; placed = true; }
        if (!placed) {                                           // no room for the label: draw the gene without it
          var best = 0;
          for (var r2 = 1; r2 < rows.length; r2++) if (rows[r2] < rows[best]) best = r2;
          g.row = best; g.lab = false; rows[best] = Math.max(rows[best], x1);
        }
      });
      genes.forEach(function (g) {                               // a gene named in the title always gets its label
        if (!g.lab && (g.n === Lc.label || Lc.full.split(" / ").indexOf(g.n) >= 0)) {
          rows.push(Infinity); g.row = rows.length - 1; g.lab = true;
        }
      });
      var rowH = 24, trackH = Math.max(1, rows.length) * rowH + 8;
      L.h = S.H - L.top - (narrow ? 54 : 40) - trackH;
      var maxLp = 0;
      Lc.idx.forEach(function (k) { if (D.lp[k] > maxLp) maxLp = D.lp[k]; });
      var yMax = Math.max(10, Math.ceil((maxLp * 1.08 + 1) / 5) * 5);
      L.y = function (v) { return L.top + L.h * (1 - v / yMax); };
      L.x = gx;
      S.layout = L;
      yAxis(ctx, L, yMax);
      /* x axis (Mb) */
      ctx.font = "11px " + C.font; ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.strokeStyle = C.grid;
      var axisY = L.top + L.h;
      ctx.beginPath(); ctx.moveTo(L.left, axisY + 0.5); ctx.lineTo(L.left + L.w, axisY + 0.5); ctx.stroke();
      var tick = S.W < 520 ? 200000 : 100000;
      for (var t = Math.ceil(lo / tick) * tick; t <= hi; t += tick) {
        var xt = Math.round(gx(t)) + 0.5;
        ctx.beginPath(); ctx.moveTo(xt, axisY); ctx.lineTo(xt, axisY + 4); ctx.stroke();
        ctx.fillText((t / 1e6).toFixed(1), xt, axisY + 6);
      }
      ctx.fillStyle = C.fg;
      ctx.fillText("Position on chromosome " + Lc.chr + " (Mb, GRCh37)", L.left + L.w / 2, axisY + 20);
      threshold(ctx, L);
      /* points: low r2 first, lead last */
      var px = new Float32Array(D.n), py = new Float32Array(D.n);
      Lc.byR2.forEach(function (k) {
        var x = gx(D.pos[k]), y = L.y(D.lp[k]);
        px[k] = x; py[k] = y;
        if (k === Lc.leadIdx) return;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 2 * Math.PI);
        ctx.fillStyle = C.ld[ldBin(D.r2[k])]; ctx.fill();
        ctx.lineWidth = 0.6; ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.stroke();
      });
      var lk = Lc.leadIdx, lx = px[lk], ly = py[lk];
      ctx.beginPath(); ctx.moveTo(lx, ly - 6.5); ctx.lineTo(lx + 6.5, ly); ctx.lineTo(lx, ly + 6.5); ctx.lineTo(lx - 6.5, ly); ctx.closePath();
      ctx.fillStyle = C.lead; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "11px " + C.font; ctx.fillStyle = C.lead; ctx.textBaseline = "bottom";
      var lid = "lead " + variantId(D, lk), lw = ctx.measureText(lid).width;
      ctx.textAlign = "left";
      ctx.fillText(lid, Math.max(L.left + 2, Math.min(L.left + L.w - lw - 2, lx - lw / 2)), Math.max(L.top + 12, ly - 9));
      /* legend */
      var lgW = 5 * 62 + 92, lgX = narrow ? 4 : L.left + L.w - lgW, lgY = 4;
      ctx.font = "11px " + C.font; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = C.fg;
      ctx.fillText("r² with lead:", lgX, lgY + 8);
      var cx = narrow ? lgX : lgX + 80, cy = narrow ? lgY + 26 : lgY + 8;   // narrow screens: items on a second line
      for (var b = 0; b < 5; b++) {
        if (cx + 52 > S.W) break;
        ctx.fillStyle = C.ld[b]; ctx.beginPath(); ctx.arc(cx + 5, cy, 4.5, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = C.muted; ctx.fillText(LD_LABELS[b], cx + 13, cy);
        cx += narrow ? 56 : 62;
      }
      /* gene track */
      var gy0 = axisY + (narrow ? 52 : 38);
      ctx.fillStyle = C.muted; ctx.font = "11px " + C.font; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      genes.forEach(function (g) {
        var y = gy0 + g.row * rowH + 6, x0 = gx(g.s), x1 = Math.max(gx(g.e), x0 + 1.5);
        var key = g.n === Lc.label || Lc.full.split(" / ").indexOf(g.n) >= 0;
        ctx.strokeStyle = key ? C.lead : C.muted; ctx.lineWidth = key ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        if (x1 - x0 > 10) {                                       // strand chevron
          var ax = g.st > 0 ? x1 : x0, d = g.st > 0 ? -4 : 4;
          ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax + d, y - 3); ctx.lineTo(ax, y); ctx.lineTo(ax + d, y + 3); ctx.stroke();
        }
        if (g.lab) {
          ctx.font = (key ? "bold italic " : "italic ") + "11px " + C.font;
          ctx.fillStyle = key ? C.lead : C.fg; ctx.textAlign = "center";
          var tw = ctx.measureText(g.n).width, mx = Math.max(L.left + tw / 2, Math.min(L.left + L.w - tw / 2, (x0 + x1) / 2));
          ctx.fillText(g.n, mx, y + 15);
        }
      });
      ctx.font = "11px " + C.font; ctx.fillStyle = C.muted; ctx.textAlign = "left";
      ctx.fillText("Genes (protein-coding, Ensembl GRCh37)", L.left, gy0 - 8);
      buildGrid(px, py, Lc.idx);
      over.setAttribute("aria-label", "Regional association plot around " + Lc.full + " on chromosome " + Lc.chr +
        ", plus or minus 400 kilobases. Points are colored by simulated r squared with the lead variant. Genes are shown below.");
      title.innerHTML = "<strong>Regional view</strong> · chr" + Lc.chr + ":" + (lo / 1e6).toFixed(2) + "–" + (hi / 1e6).toFixed(2) +
        " Mb · genes near the peak: <em>" + esc(Lc.full) + "</em>";
    }

    /* ---------------- hit testing (uniform grid over screen coordinates) */
    function buildGrid(px, py, subset) {
      var cs = 8, cols = Math.ceil(S.W / cs) + 1, rowsN = Math.ceil(S.H / cs) + 1, nc = cols * rowsN;
      var cnt = new Uint32Array(nc + 1), list = subset || null, D = S.D, n = list ? list.length : D.n, i, k, cell;
      var cells = new Int32Array(n);
      for (i = 0; i < n; i++) {
        k = list ? list[i] : i;
        var cx = Math.floor(px[k] / cs), cy = Math.floor(py[k] / cs);
        cell = (cx < 0 || cy < 0 || cx >= cols || cy >= rowsN) ? -1 : cy * cols + cx;
        cells[i] = cell;
        if (cell >= 0) cnt[cell + 1]++;
      }
      for (i = 0; i < nc; i++) cnt[i + 1] += cnt[i];
      var fillPos = cnt.slice(0, nc), items = new Uint32Array(cnt[nc]);
      for (i = 0; i < n; i++) if (cells[i] >= 0) items[fillPos[cells[i]]++] = list ? list[i] : i;
      S.grid = { cs: cs, cols: cols, rows: rowsN, start: cnt, items: items };
      S.pts = { x: px, y: py };
    }
    function nearest(x, y, rad) {
      var g = S.grid; if (!g) return -1;
      var cx = Math.floor(x / g.cs), cy = Math.floor(y / g.cs), span = Math.ceil(rad / g.cs), best = -1, bd = rad * rad;
      for (var yy = cy - span; yy <= cy + span; yy++) {
        if (yy < 0 || yy >= g.rows) continue;
        for (var xx = cx - span; xx <= cx + span; xx++) {
          if (xx < 0 || xx >= g.cols) continue;
          var c = yy * g.cols + xx;
          for (var t = g.start[c]; t < g.start[c + 1]; t++) {
            var k = g.items[t], dx = S.pts.x[k] - x, dy = S.pts.y[k] - y, d = dx * dx + dy * dy;
            if (d <= bd && (best < 0 || d < bd || S.D.lp[k] > S.D.lp[best])) { bd = d; best = k; }
          }
        }
      }
      return best;
    }

    /* ---------------- overlay, readout and QQ */
    function drawOverlay() {
      var ctx = over.getContext("2d");
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, S.W, S.H);
      [S.sel, S.hover].forEach(function (k, j) {
        if (k < 0 || !S.pts) return;
        if (S.view >= 0 && S.D.loc[k] !== S.view) return;
        var x = S.pts.x[k], y = S.pts.y[k];
        ctx.beginPath(); ctx.arc(x, y, j ? 6 : 7.5, 0, 2 * Math.PI);
        ctx.lineWidth = 2; ctx.strokeStyle = j ? C.fg : C.accent; ctx.stroke();
      });
    }
    function showRow(k) {
      if (k < 0) { readout.innerHTML = ""; return; }
      var D = S.D, row = regenieRow(D, k, S.c), head = "", vals = "";
      COLS.forEach(function (c) { head += "<th>" + c + "</th>"; vals += "<td>" + esc(row[c]) + "</td>"; });
      var li = D.loc[k], where;
      if (li >= 0) {
        var Lc = D.loci[li];
        where = "simulated variant in the <em>" + esc(Lc.full) + "</em> region" + (k === Lc.leadIdx ? " (lead variant)" :
          " · simulated r² with the lead variant = " + D.r2[k].toFixed(2));
      } else where = "simulated background variant (no true effect)";
      var sig = D.lp[k] >= GWS ? "genome-wide significant (p &lt; 5 × 10⁻⁸)" : "not genome-wide significant";
      readout.innerHTML = "<div class=\"mh-rowlabel\">Summary-statistics row (all 14 REGENIE columns, simulated; scroll sideways)</div>" +
        "<div class=\"mh-tablewrap\"><table class=\"mh-tbl\"><thead><tr>" + head + "</tr></thead><tbody><tr>" + vals +
        "</tr></tbody></table></div><p class=\"mh-ann\">p = " + fmtP(D.lp[k]) + " · " + sig + " · " + where +
        (S.view < 0 && li >= 0 && D.lp[k] >= 4 ? " · <button type=\"button\" class=\"btn mh-zoom\" data-li=\"" + li + "\">Zoom into this region →</button>" : "") + "</p>";
      var zb = readout.querySelector(".mh-zoom");
      if (zb) zb.addEventListener("click", function () { zoomTo(+zb.getAttribute("data-li")); });
    }
    function drawQQ() {
      var D = S.D, ctx = qq.getContext("2d"), s = S.qs;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, s, s);
      var L = { left: 34, top: 8, w: s - 34 - 8, h: s - 8 - 34 };
      var xMax = Math.ceil(D.expLp[0] + 0.3), yCap = 12;
      var X = function (v) { return L.left + L.w * Math.min(v, xMax) / xMax; };
      var Y = function (v) { return L.top + L.h * (1 - Math.min(v, yCap) / yCap); };
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.strokeRect(L.left + 0.5, L.top + 0.5, L.w, L.h);
      ctx.font = "11px " + C.font; ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var t = 0; t <= xMax; t += 2) ctx.fillText(String(t), X(t), L.top + L.h + 3);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var u = 0; u <= yCap; u += 4) ctx.fillText(String(u), L.left - 4, Y(u));
      ctx.fillStyle = C.fg; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("expected −log₁₀(p)", L.left + L.w / 2, L.top + L.h + 17);
      ctx.save(); ctx.translate(10, L.top + L.h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = "middle";
      ctx.fillText("observed", 0, 0); ctx.restore();
      ctx.strokeStyle = C.muted; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(Math.min(xMax, yCap)), Y(Math.min(xMax, yCap))); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.odd;
      for (var r = 0; r < D.n; r++) {
        var k = D.order[r], ov = D.lp[k];
        if (ov < 1.5 && r % 7) continue;                            // the bulk is drawn sparsely
        var x = X(D.expLp[r]), y = Y(ov);
        if (ov > yCap) { ctx.beginPath(); ctx.moveTo(x, L.top + 1); ctx.lineTo(x - 3, L.top + 6); ctx.lineTo(x + 3, L.top + 6); ctx.fill(); }
        else ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      }
      lam.innerHTML = "λ = " + S.lambda.toFixed(2) + " <span>(median χ² ÷ 0.455)</span>" +
        "<div class=\"mh-qqnote\">Triangles at the top: points above " + yCap + ". " +
        (S.c > 1 ? "Every statistic is inflated, so the whole curve lifts off the dashed line." :
          "The bulk follows the dashed line; only the real peaks rise at the end.") + "</div>";
      qq.setAttribute("aria-label", "QQ plot: observed against expected minus log10 p-values. Genomic inflation factor lambda equals " +
        S.lambda.toFixed(2) + ".");
    }

    function render() {
      size();
      if (S.view < 0) drawGenome(); else drawRegion(S.view);
      back.disabled = S.view < 0;
      sel.value = String(S.view);
      drawOverlay();
      showRow(S.hover >= 0 ? S.hover : S.sel);
      drawQQ();
    }
    function zoomTo(li) {
      S.view = li; S.hover = -1;
      S.sel = li >= 0 ? S.D.loci[li].leadIdx : S.sel;
      if (li >= 0) S.regKey = S.D.loci[li].byPos.indexOf(S.sel);
      render();
    }

    /* ---------------- events */
    function local(e) { var r = over.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    var lastType = "mouse";
    over.addEventListener("pointermove", function (e) {
      lastType = e.pointerType || "mouse";
      if (lastType !== "mouse") return;
      var p = local(e), k = nearest(p.x, p.y, 7);
      if (k !== S.hover) { S.hover = k; drawOverlay(); showRow(k >= 0 ? k : S.sel); }
    });
    over.addEventListener("pointerleave", function () {
      if (S.hover >= 0) { S.hover = -1; drawOverlay(); showRow(S.sel); }
    });
    over.addEventListener("pointerdown", function (e) { lastType = e.pointerType || "mouse"; });
    over.addEventListener("click", function (e) {
      var p = local(e), k = nearest(p.x, p.y, lastType === "mouse" ? 7 : 14);
      if (k < 0) return;
      var li = S.D.loc[k];
      if (S.view < 0 && li >= 0 && S.D.lp[k] >= 4) { zoomTo(li); S.sel = k; S.regKey = S.D.loci[li].byPos.indexOf(k); drawOverlay(); showRow(k); return; }
      S.sel = k; S.hover = -1;
      if (S.view >= 0) S.regKey = S.D.loci[S.view].byPos.indexOf(k);
      drawOverlay(); showRow(k);
    });
    over.addEventListener("keydown", function (e) {
      var D = S.D, handled = true;
      if (S.view < 0) {
        var order = lociSorted();
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          var cur = order.indexOf(D.loc[S.sel]);
          if (cur < 0) cur = e.key === "ArrowRight" ? -1 : 0;
          var nx = (cur + (e.key === "ArrowRight" ? 1 : -1) + order.length) % order.length;
          S.sel = D.loci[order[nx]].leadIdx;
        } else if (e.key === "Home") S.sel = D.loci[order[0]].leadIdx;
        else if (e.key === "Enter" || e.key === " ") { if (D.loc[S.sel] >= 0) { zoomTo(D.loc[S.sel]); return e.preventDefault(); } }
        else handled = false;
      } else {
        var Lc = D.loci[S.view], bp = Lc.byPos, idx = bp.indexOf(S.sel);
        if (idx < 0) idx = bp.indexOf(Lc.leadIdx);
        if (e.key === "ArrowRight") idx = Math.min(bp.length - 1, idx + 1);
        else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
        else if (e.key === "PageDown") idx = Math.min(bp.length - 1, idx + 10);
        else if (e.key === "PageUp") idx = Math.max(0, idx - 10);
        else if (e.key === "Home") idx = bp.indexOf(Lc.leadIdx);
        else if (e.key === "Escape" || e.key === "Backspace") { var from = S.view; zoomTo(-1); S.sel = D.loci[from].leadIdx; drawOverlay(); showRow(S.sel); return e.preventDefault(); }
        else handled = false;
        if (handled) S.sel = bp[idx];
      }
      if (handled) { e.preventDefault(); S.hover = -1; drawOverlay(); showRow(S.sel); }
    });
    sel.addEventListener("change", function () { zoomTo(+sel.value); });
    back.addEventListener("click", function () { var from = S.view; zoomTo(-1); if (from >= 0) { S.sel = S.D.loci[from].leadIdx; drawOverlay(); showRow(S.sel); } });
    infl.addEventListener("change", function () {
      S.c = infl.checked ? INFLATE : 1;
      S.lambda = applyInflation(S.D, S.c);
      render();
    });
    resample.addEventListener("click", function () { S.seed = (S.seed + 7919) >>> 0; regenerate(); });
    var pending = false;
    function onResize() {
      if (pending) return; pending = true;
      requestAnimationFrame(function () { pending = false; if (Math.abs(plotWrap.clientWidth - S.W) > 2) render(); });
    }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(plotWrap);
    else window.addEventListener("resize", onResize);

    regenerate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
