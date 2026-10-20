// keys-test.cjs - known-answer tests for site/client/kairos-keys.js
// Run from site/_studio:  node keys-test.cjs
'use strict';
// BLAKE3 official test vectors (BLAKE3-team/BLAKE3 test_vectors/test_vectors.json):
// [input_len, hash[..32], derive_key[..32]]; context "BLAKE3 2019-12-27 16:29:52 test vectors context"
const B3_CONTEXT = "BLAKE3 2019-12-27 16:29:52 test vectors context";
const B3_EXT = [3,"440aba35cb006b61fc17c0529255de438efc06a8c9ebf3f2ddac3b5a86705797f27e2e914574f4d87ec04c379e12789eccbfbc15892626042707802dbe4e97c3ff59dca80c1e54246b6d055154f7348a39b7d098b2b4824ebe90e104e763b2a447512132cede16243484a55a4e40a85790038bb0dcf762e8c053cabae41bbe22a5bff7"];
const B3_VECTORS = [
  [0,"af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262","2cc39783c223154fea8dfb7c1b1660f2ac2dcbd1c1de8277b0b0dd39b7e50d7d"],
  [1,"2d3adedff11b61f14c886e35afa036736dcd87a74d27b5c1510225d0f592e213","b3e2e340a117a499c6cf2398a19ee0d29cca2bb7404c73063382693bf66cb06c"],
  [2,"7b7015bb92cf0b318037702a6cdd81dee41224f734684c2c122cd6359cb1ee63","1f166565a7df0098ee65922d7fea425fb18b9943f19d6161e2d17939356168e6"],
  [3,"e1be4d7a8ab5560aa4199eea339849ba8e293d55ca0a81006726d184519e647f","440aba35cb006b61fc17c0529255de438efc06a8c9ebf3f2ddac3b5a86705797"],
  [4,"f30f5ab28fe047904037f77b6da4fea1e27241c5d132638d8bedce9d40494f32","f46085c8190d69022369ce1a18880e9b369c135eb93f3c63550d3e7630e91060"],
  [5,"b40b44dfd97e7a84a996a91af8b85188c66c126940ba7aad2e7ae6b385402aa2","1f24eda69dbcb752847ec3ebb5dd42836d86e58500c7c98d906ecd82ed9ae47f"],
  [6,"06c4e8ffb6872fad96f9aaca5eee1553eb62aed0ad7198cef42e87f6a616c844","be96b30b37919fe4379dfbe752ae77b4f7e2ab92f7ff27435f76f2f065f6a5f4"],
  [7,"3f8770f387faad08faa9d8414e9f449ac68e6ff0417f673f602a646a891419fe","dc3b6485f9d94935329442916b0d059685ba815a1fa2a14107217453a7fc9f0e"],
  [8,"2351207d04fc16ade43ccab08600939c7c1fa70a5c0aaca76063d04c3228eaeb","2b166978cef14d9d438046c720519d8b1cad707e199746f1562d0c87fbd32940"],
  [63,"e9bc37a594daad83be9470df7f7b3798297c3d834ce80ba85d6e207627b7db7b","b6451e30b953c206e34644c6803724e9d2725e0893039cfc49584f991f451af3"],
  [64,"4eed7141ea4a5cd4b788606bd23f46e212af9cacebacdc7d1f4c6dc7f2511b98","a5c4a7053fa86b64746d4bb688d06ad1f02a18fce9afd3e818fefaa7126bf73e"],
  [65,"de1e5fa0be70df6d2be8fffd0e99ceaa8eb6e8c93a63f2d8d1c30ecb6b263dee","51fd05c3c1cfbc8ed67d139ad76f5cf8236cd2acd26627a30c104dfd9d3ff8a8"],
  [127,"d81293fda863f008c09e92fc382a81f5a0b4a1251cba1634016a0f86a6bd640d","c91c090ceee3a3ac81902da31838012625bbcd73fcb92e7d7e56f78deba4f0c3"],
  [128,"f17e570564b26578c33bb7f44643f539624b05df1a76c81f30acd548c44b45ef","81720f34452f58a0120a58b6b4608384b5c51d11f39ce97161a0c0e442ca0225"],
  [129,"683aaae9f3c5ba37eaaf072aed0f9e30bac0865137bae68b1fde4ca2aebdcb12","938d2d4435be30eafdbb2b7031f7857c98b04881227391dc40db3c7b21f41fc1"],
  [1023,"10108970eeda3eb932baac1428c7a2163b0e924c9a9e25b35bba72b28f70bd11","74a16c1c3d44368a86e1ca6df64be6a2f64cce8f09220787450722d85725dea5"],
  [1024,"42214739f095a406f3fc83deb889744ac00df831c10daa55189b5d121c855af7","7356cd7720d5b66b6d0697eb3177d9f8d73a4a5c5e968896eb6a689684302706"],
  [1025,"d00278ae47eb27b34faecf67b4fe263f82d5412916c1ffd97c8cb7fb814b8444","effaa245f065fbf82ac186839a249707c3bddf6d3fdda22d1b95a3c970379bcb"],
  [2048,"e776b6028c7cd22a4d0ba182a8bf62205d2ef576467e838ed6f2529b85fba24a","7b2945cb4fef70885cc5d78a87bf6f6207dd901ff239201351ffac04e1088a23"],
  [2049,"5f4d72f40d7a5f82b15ca2b2e44b1de3c2ef86c426c95c1af0b6879522563030","2ea477c5515cc3dd606512ee72bb3e0e758cfae7232826f35fb98ca1bcbdf273"],
  [3072,"b98cb0ff3623be03326b373de6b9095218513e64f1ee2edd2525c7ad1e5cffd2","050df97f8c2ead654d9bb3ab8c9178edcd902a32f8495949feadcc1e0480c46b"],
  [3073,"7124b49501012f81cc7f11ca069ec9226cecb8a2c850cfe644e327d22d3e1cd3","72613c9ec9ff7e40f8f5c173784c532ad852e827dba2bf85b2ab4b76f7079081"],
  [4096,"015094013f57a5277b59d8475c0501042c0b642e531b0a1c8f58d2163229e969","1e0d7f3db8c414c97c6307cbda6cd27ac3b030949da8e23be1a1a924ad2f25b9"],
  [4097,"9b4052b38f1c5fc8b1f9ff7ac7b27cd242487b3d890d15c96a1c25b8aa0fb995","aca51029626b55fda7117b42a7c211f8c6e9ba4fe5b7a8ca922f34299500ead8"],
  [5120,"9cadc15fed8b5d854562b26a9536d9707cadeda9b143978f319ab34230535833","7a7acac8a02adcf3038d74cdd1d34527de8a0fcc0ee3399d1262397ce5817f60"],
  [5121,"628bd2cb2004694adaab7bbd778a25df25c47b9d4155a55f8fbd79f2fe154cff","b07f01e518e702f7ccb44a267e9e112d403a7b3f4883a47ffbed4b48339b3c34"],
  [6144,"3e2e5b74e048f3add6d21faab3f83aa44d3b2278afb83b80b3c35164ebeca205","2a95beae63ddce523762355cf4b9c1d8f131465780a391286a5d01abb5683a15"],
  [6145,"f1323a8631446cc50536a9f705ee5cb619424d46887f3c376c695b70e0f0507f","379bcc61d0051dd489f686c13de00d5b14c505245103dc040d9e4dd1facab8e5"],
  [7168,"61da957ec2499a95d6b8023e2b0e604ec7f6b50e80a9678b89d2628e99ada77a","11c37a112765370c94a51415d0d651190c288566e295d505defdad895dae2237"],
  [7169,"a003fc7a51754a9b3c7fae0367ab3d782dccf28855a03d435f8cfe74605e7817","554b0a5efea9ef183f2f9b931b7497995d9eb26f5c5c6dad2b97d62fc5ac31d9"],
  [8192,"aae792484c8efe4f19e2ca7d371d8c467ffb10748d8a5a1ae579948f718a2a63","ad01d7ae4ad059b0d33baa3c01319dcf8088094d0359e5fd45d6aeaa8b2d0c3d"],
  [8193,"bab6c09cb8ce8cf459261398d2e7aef35700bf488116ceb94a36d0f5f1b7bc3b","af1e0346e389b17c23200270a64aa4e1ead98c61695d917de7d5b00491c9b0f1"],
  [16384,"f875d6646de28985646f34ee13be9a576fd515f76b5b0a26bb324735041ddde4","160e18b5878cd0df1c3af85eb25a0db5344d43a6fbd7a8ef4ed98d0714c3f7e1"],
  [31744,"62b6960e1a44bcc1eb1a611a8d6235b6b4b78f32e7abc4fb4c6cdcce94895c47","39772aef80e0ebe60596361e45b061e8f417429d529171b6764468c22928e28e"],
  [102400,"bc3e3d41a1146b069abffad3c0d44860cf664390afce4d9661f7902e7943e085","4652cff7a3f385a6103b5c260fc1593e13c778dbe608efb092fe7ee69df6e9c6"]
];
// noid_core/src/hardware.rs:29-158 TOWER_TO_FLAT, :161-290 FLAT_TO_TOWER
const TOWER_TO_FLAT = [0x1n,0x3d5bd35c94646a247573da4a5f7710edn,0xa72ec17764d7ced55e2f716f4ede412fn,0x553e92e8bc0ae9a795ed1f57f3632d4dn,0xc7bd33d0a58cf5b4740d6c968b842acbn,0x486fb01f93aa169afd8ee716e990cf14n,0xbee4e4dc44629cf627b537f28935c282n,0x549810e11a88dea5252b49277b1b82b4n,0x6198d3a7b756c056bd3d5a025c8d370an,0xb2ef6c31981e31582924ed9040490830n,0x9ee93d00b6b040353ebf5c8e0d4401dn,0xff829109128b0bd884cb11891ab51a3cn,0x25ce422cd636209fd58e3eee6bcdb7d7n,0x86b6a57216f083193e1b361e8a1a5bbfn,0x38e5c77d01ea3f466707ab5ea8ff4171n,0x2de7ef9721e4b0550d4fe61188fb1bd3n,0x5c4feb37d9ad179b297b823812957b8cn,0x8e36a06b2ac838db09f04ada993caa84n,0xc6082bd8edaaae4873fb728376565fffn,0x9b92a729351ab577a2b0de27d713817an,0xb7106c3879c5c033015afe43a7bbb48fn,0xe638c5d1336cc967dd424e375f37904fn,0xef30fbf0630e9d04f9efc7d242801381n,0x548ecca55b43556101c39dffff23087n,0xa3dc4d913d605620dae083b969cba697n,0x60c413bae203bcfee863fce3d62d7a46n,0xe3f02a180f232bd7f9e6c41f2ad92bb1n,0x4983d83fd28ea811148387423931f5c8n,0x449a77f55b99ac57dcb2131788da3392n,0x611ba189d789d45401af9d0333b3f9e7n,0xb67819253374dc0ae0ec21b8ad160234n,0xf23ff08f2566732b188cdc592a0eb8f7n,0xc9ac57d3e240265a401dc6270f59c10n,0x3493b22a21cc4c396552505d8c638d9bn,0x757fa4336d785da4447251e433ed42fbn,0x6d2979d4d4a745250ea377dabd44cfb2n,0x55583ad2a44322ab8ca02871898d1f81n,0x86373be6909783ffc8bb21b3dda24f12n,0xc3f3f28407ec57a4a53af471e53285cn,0x972c409ddb7f2db55ee11ac6a242e45cn,0x96f938744906740774c33c247ccf85d8n,0x4cae10232a3558fa26fbc92fab97488bn,0x8bb0008776ffc7e44db0cc1a2df288b9n,0x1d0703e4ee2237c7ab53e5b75d921bd7n,0xff012dbc34f0271cce6d0c1b0d125e3an,0x9aea02703d99a98cb9e1b3a368dce85bn,0xb39755229db1f4de29498e7a13e7cdc2n,0xc31176b1b646603fc50a528e49742a0en,0xead0dc2950f39b1eb2c2edb9407de10dn,0xea3f3fe33d1d2b7d3cf38b78900dab86n,0x51bd919a56eb92348316675811dc923n,0xba5ae9f94b493aa478e08aa4f415cb18n,0x141e17265a74f46bb369c916cbaf8a25n,0x6c99c4af650a8451a195d75a7769413bn,0x342484168e3692419b8ea7e8fdcc8f8dn,0xaa7a29ea7ae49742f8aa7027b065617dn,0xd345f319cf8d0c5711c92a1a19cf232cn,0xbf7956da104bb930529470fbcfa3f60en,0xaf3c8a62ae50f00d8dd54ec40c51d402n,0x9f40c849b5f5405f91589271eefd831en,0x82131c9fe93d42fe3eac43b40fe78613n,0xee5d797779ee1b27b76d3ed1cee66addn,0xb7438c8a8d29a42710da3eeb0dcaa4f4n,0x884f37a7a1f9068c7b8dbfb652cfb52n,0x9b027a35e430ddaa521ef0fd91f39162n,0xb619b3c28e9fd05efbcd5ead6935a75cn,0xcad054f32f966043874b2e8163127c7n,0x8ec4fff59680eaae0077f3dd83fbd947n,0x50d8597763331f8dcea34c16608a96a7n,0x6d03608d9f2a6e86dd0d62d96a32751dn,0x49110668fefb446975dea1bb5742ad75n,0xde3c54e5dc0bf89137cf5d286ba5868an,0x61121e79a40f65000fb426800e5b4f0bn,0x996944c65744223a5ef06f1eda08fd6n,0xda3cbe76b9f383e1cde547094cf05431n,0xa3a2b75fb155f13733c11156ff19d609n,0xfb4449056e5c6fb2d9a33f42f0a893adn,0x128f41399db28643d0743873dc1264an,0xff09c9c044dd9342be235156d0bf9197n,0xcbb652c3d0896219d921f2c49b28d8e7n,0x61102a46cc01cdf697b666aa7d3d8d45n,0x717c5e9d4a0731b69d1e33a8f128eeddn,0xd3498c6de1db846fb5b84c3d08a26402n,0x1d074123e95f221742bb042dd2decd90n,0x49dd214c370bbb55e8a3a82b147053ben,0x18af31dbbab9458eb16b27c0fd1c309fn,0x61e2d820490e7be32289961803263c34n,0x107fa373d60153306bcebc6f2ea6aac5n,0x3df814508cd896e7813397e8a778f8cdn,0x4021c8146d9e0d33e353d0c73604d58en,0xee2c21eb408160983c5ccee03d280f85n,0xe77f3ff735b6b82a28ab2ed8e3fc8320n,0x8eee1c68d1cbc4b55eefff30ae3f6028n,0xfabf471e3d132661b55c0f419db06696n,0x69a006d6b32d6e23d48dde5999c10f7dn,0x389f96875b52a0cdaf55c6a03819c6f1n,0xd349d8dacbf6f4a04625d7953d3190bdn,0xbe8502448366699e39f5117acfd01714n,0xa3839a34242c75f7ffc21bd9c630459bn,0xb3c2ef7bbf449f8af05d8a9a760e9407n,0x694d27a4f1ba1074a7c2e5445f874b2dn,0x855c18884723bdcb6dff2cf4849ec19n,0x58d911a330ce147d06afb9ccb802b7dbn,0xde87764a4427a4aff5db695eda550c2an,0xbfa47075ed035846f2016301eb7e4009n,0xd7335e553652ccbc3f0ff542099a9636n,0xede815347e14cec1440aa1c612391bn,0x96e7e4d4efb40213aa73764edddd4ff6n,0x399c2dd474a47a3f36d286b7e1d3b32bn,0xcaaeb9876b882f04dc62c5f814d4f79cn,0x5c7127c96b5c4300fe9954f7999e2f5an,0xfe1178bc295c981e59278e0135930986n,0xe3a9112535f5f53b6a9acc3e49877fd2n,0x3d6051a6cf2bb75e59ff8f7991cf6badn,0x30d97c016d51144b717181ec5f826ba3n,0xe3b2c049622bdaa3e7e81e99b46920een,0x547744dda2f0145457aacf948f0aca14n,0x822e4b280fbbaf701b00d1cf2675dacfn,0x13dae85beaa0a8bb735a39898b93504n,0xaeed75387d73a822299a17f008c4cd8cn,0x2d4278deab8e9cdeb21b66e82f85dea7n,0x5745efd4f8b0dc873484e5f3c83ed61n,0x456a83da121c2fc61b55c9bd216a36cdn,0x6ccd4a5d0819113889547d0e69bac59bn,0xbec7bd6ab8e7169c06c93f34451b5aben,0xb9e80fcc7ca8fe72faafc4143960829an,0xbbfefb3dd63f00f3f8407e5f20d87c6an,0x91b376701a386e5aee6fdbd0738b4c99n];
const FLAT_TO_TOWER = [0x1n,0xe9453afbbb5efa683426e20fcdbc3b96n,0x1c17484568577f0b04c63c03208aeb8an,0x4adf5cfe6486e00ca9f6f0b3f58b122n,0x4bad34793b579f5c90920a4453c26f86n,0xfc24da72abcee7f5f01fbedeb26a8df9n,0x1091dcf0350c7dc7c2e119ec5af1fc07n,0x472c8b0c136435be967e8ef8074dced9n,0xee63773a41b8bbd26fcb07ebd4630981n,0x2fc50cfe61e714bbe42ae0de5fd0d8dn,0x168a685e2f21945aa9736c6bb7c2895cn,0xdbec3dae32169816645d4935276b15dn,0x1bcdfffc8342ca4dc8bfedc18a3078d9n,0x1e81239207e6ef6e793f115bf0d1ddc0n,0xbe1603d9dcb9eef74e5b36e05726ffafn,0xe1b26ab22e51d6585535ccbca9496a06n,0x9f9e05a29dd55fa844808cc9a48d50cn,0x21aaba3a74e307cc2ded8391e34e8e9n,0x4966d3e1afc209d7f157b26e887a38an,0xaf7446de9259fba17a5602c30e34c669n,0xf25b0fd6d577f77f9d1882fb0bc5ba0n,0x1d459f2a48cefb1c3cd4e7a6ec5dfa4bn,0x5177981cdf5b750cc65ad9ea7ca055a4n,0x51f9fbcea7da4578c92da6c12526013en,0x5e5568bae10fd0bea4055c77b9a844c3n,0xe421662a1e1eec508af632be1f0e02a4n,0x4fb8a006db40f3160af93b49a86074d9n,0x45ae448d6e7f1d9eb69a344d34af8f84n,0xb9c51ce3b12188ad65e7759b1f401559n,0xabbb0931ab3235c58087e2dbc96ad33fn,0x5c9cf000628598d60736ed8ccf038e67n,0xb600769f47150f0b5cfaad9450463bedn,0x41ff7793986a07fac4a9907ae8a743c2n,0x9285f4c18937b3185fabe5973520296n,0x4df8dc9851d9e1c3e7a14efcbfb2f95n,0xf84536296d274eacfca1c8ec05ff86f2n,0x10a307e4b186622325d30a95cecef780n,0xb707ef2d98cf44184ddac671e2eb5fe3n,0xa36bd753c6ba59d052163d58f1bed352n,0xbb51e68d389f63b3fe34ed01757689b0n,0x553399b0b5fc844caf168701fe5943e2n,0x149dde950e34d85250b4a4567313dbcen,0x4a3936263f0c100aa4c65c24c9f26072n,0x4104e328f53e6a7de372c31b4ad5ad83n,0xb1183d7d5bd62290a0a89715d0f4c888n,0x4d660de92cacf0dd908421c7e6d1808dn,0xb1d657600dafa9208939ab4849c39960n,0x3a20e7aba728cd09b64d73cf2f674f4n,0xe43e9984cf41aa0882197d2781f8b96fn,0xbad1c62b0bff422854213e279a1c233dn,0x4d0e6bd946302e439aac65df948a1cfen,0xffd379747924682586a493942c8bd1dfn,0xfe5f1194837be346fdb10eba477ab638n,0x5295b8af5c0ddbed902930dfa570304dn,0xba080add877d62a18cd4628ef7af6b4cn,0x1e25371b9377b58089920b6a510400d3n,0xac7c0e8e02a2200be87117633cbdd070n,0xf366765716b499d4b7321e9df5959b66n,0xb339b133a83acbbe7e547facbe195298n,0x1475d3694c484e493e02607bf9356c65n,0xe0cef1d5986e8d2d605e21f64226e065n,0xa558f89882728f0ad97427c3f9a5f8e4n,0xf912accaae2365e62b05093b2bf33d56n,0xe131db01ea71d934b2eb168465351fa8n,0xaa8f05ca85112b1e8297c34477ceeb64n,0xdc63231f0469178d0d4de381700cb51n,0x41d4d8767a16e1d2bf0a593c25f52b86n,0xad26c0aee1dd7aedd2b22cef38dd64e7n,0x10491ee2eca4e054f64c3d01df6061f8n,0xfaaf99c9d558bdd129634f9bc0b49d13n,0x67a7a8aa629a19a5713b939774af76en,0x1c447ad4acaa6cf468c10599af589e85n,0x1bbe72b8a35a9c3f87a1f1858fe5aa7an,0x8d64d109f41fd0101dc11cce5fa73a6n,0xf827b63c8f571568d3cf4c1ee4ecd03en,0x5bb2d722803b61c1b08d89d05152ee9bn,0xf3cb7ef7f453aef94c19b7fce8aa0805n,0x450d1ab8d3157a5bb23d60c579d34dc9n,0xa86d9af6cb03acbd901235280394a449n,0xe97768fce8cdf250bfa8bb1d0878b3e4n,0xa1951a61df54b357cfcf4ae3ebc3ccfdn,0xb76dfde0d95a8d217f54a72f0eddffafn,0xbabb93003d8bec9bb5efd043338801fn,0xdb4962025555aab1dabf8c6eda931dn,0xefd282331287775f9cb76d437afa2af4n,0x5a68ffc8bb123839157cede80abb56n,0xaa8cf4dfecd7c6e8756dd13b5c8f5acan,0x21af06bb686259ccb7fd58ec495d475n,0xecdf1c0a39e0e69edd223ac63f94d3cdn,0x464b5cd033da15250a59b81eb662376dn,0xfaa1c4106cecddd1e1ef0970d9739a93n,0xb8ca7cb682820f3876fa81b790ed93c1n,0xecba8b8b7f03d6c49ad4f151c9260931n,0x1d60dcb980bbf80cf229556b3903eaefn,0x5525a3168b2928eb6704455f531f9cen,0xe799e7eb44a895f570225704932e2b1an,0x4d407b2df1588fdb990fba30221753a7n,0x5a9bb03388d916788319c89624300d82n,0xa9d77c570bd47c6c66e124345a17db90n,0xa9ec560bb73e81d57e752162bbe4f3cn,0xfa265c428c9da6f28e2fc970136e0b28n,0xa5743cf56a237597ce580031f065e75en,0x137972c4434747054820151b571875b0n,0x5c8cdc9126773bb5d414b37e60366586n,0x129391be83f7a47bb70290df3750e40fn,0xaeda7d495fc263f9b03de9fc7e321746n,0xb4e1e37de895f7eebdb5b5394b075ef8n,0xe2b5f04d33cf20822382a35dcc7edc4en,0xa9bcd291a1cf815f152fecdcbcccc914n,0x5aa7ba1307657374613559d3f5f81fa7n,0x4f5e74a697aee5d693c4698eebae59b5n,0x155632caedb80d6b686706af56fc4b90n,0xa68b8340c09a94a676d7d9a0790e3456n,0xa12400cbbd51083dc4fca4a59fefba1dn,0x436bbf27feb7ddeff06b53646f98b6b9n,0xf9c43925d9ee85198e028ccfa403b668n,0xe832f276830d436561fdd088096c633bn,0x1bb6e92daca9c758540c1f17d6a3c2f9n,0xbb665e8a1f6f65dcb9c4864cb7ebf64n,0xa58c2b939b7520a6fb1195e3a64b9e09n,0x5d30484d6e9d13e9534ba48d6aa27e29n,0x8948e62e9301d8fc28508f145c89bcb0n,0xe70f02d3ff944a7f3fc77b1ef5e28fe3n,0xb0a4e40faf35483b62a6ac2a434b53f5n,0x7ff946d827c42ea27368426556c796fn,0x1e487747cb1f2330293d260d4ef9e331n,0x5c037a6cfa8c994eeda5fb46a4b26d21n,0x26f2a0c6d87933fbc981c086e67c361dn];

// ---------------------------------------------------------------------------
const K = require('../client/kairos-keys.js');
const I = K._internal;
let pass = 0, fail = 0;
const groups = {};
function ok(group, cond, msg) {
  groups[group] = groups[group] || [0, 0];
  if (cond) { pass++; groups[group][0]++; } else { fail++; groups[group][1]++; console.log('FAIL [' + group + '] ' + msg); }
}
const hex = I.toHex, unhex = I.fromHex;
const big = (w) => (BigInt(w[3]) << 96n) | (BigInt(w[2]) << 64n) | (BigInt(w[1]) << 32n) | BigInt(w[0]);
const words = (v) => [0, 1, 2, 3].map((i) => Number((v >> BigInt(32 * i)) & 0xffffffffn));
const M128 = (1n << 128n) - 1n;

// --- 1. Field: in-repo unit vectors --------------------------------------
ok('field', I.mul8(2, 2) === 4, 'block8.rs:246 2*2=4');
ok('field', I.mul8(0x57, 0x83) === 0xc1, 'block8.rs:248 AES 0x57*0x83=0xC1');
{ // block128.rs:214-220 karatsuba_x_squared: X=(lo 0, hi 1) ; X^2 = (lo TAU64, hi 1)
  const x = [0, 0, 1, 0];
  const sq = I.mul128(x, x);
  ok('field', big(sq) === ((1n << 64n) | 0x2000000000000000n), 'block128.rs:214 x^2 == (0x2000..., 1)');
}
{ // inverse table exhaustive (block8.rs:252-261): every nonzero has an inverse
  let good = true;
  for (let a = 1; a < 256; a++) { let f = false; for (let b = 1; b < 256; b++) if (I.mul8(a, b) === 1) { f = true; break; } if (!f) good = false; }
  ok('field', good, 'GF(2^8) every nonzero invertible');
}

// --- 2. Field: independent cross-check vs Rust's tower<->GCM basis tables -----
// hardware.rs: tower_to_flat (apply_matrix, bit i -> row i), clmul_gcm mod x^128+x^7+x^2+x+1.
function applyMatrix(m, v) { let r = 0n; for (let i = 0; i < 128; i++) if ((v >> BigInt(i)) & 1n) r ^= m[i]; return r; }
function clmulGcm(a, b) {
  let r = 0n; for (let i = 0; i < 128; i++) if ((b >> BigInt(i)) & 1n) r ^= a << BigInt(i);
  for (let i = 254; i >= 128; i--) if ((r >> BigInt(i)) & 1n) r ^= (0x87n | (1n << 128n)) << BigInt(i - 128);
  return r & M128;
}
const t2f = (v) => applyMatrix(TOWER_TO_FLAT, v), f2t = (v) => applyMatrix(FLAT_TO_TOWER, v);
let seed = 0x12345678;
function rnd32() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; }
const rnd128 = () => [rnd32(), rnd32(), rnd32(), rnd32()];
for (let k = 0; k < 300; k++) {
  const a = rnd128(), b = rnd128();
  ok('field-x-gcm', t2f(big(I.mul128(a, b))) === clmulGcm(t2f(big(a)), t2f(big(b))), 'tower mul homomorphic to GCM clmul #' + k);
}
for (let k = 0; k < 50; k++) { const a = big(rnd128()); ok('field-x-gcm', f2t(t2f(a)) === a, 'basis round trip'); }

// --- 3. Permutation: tower schedule vs Rust's flat (GCM) schedule -----------
// permutation.rs:50-90 runs in the flat basis with clmul_gcm + square_flat; its
// test flat_permutation_matches_tower_reference (:241-265) asserts equality with
// the tower schedule on these exact fixtures. We re-implement the FLAT path from
// hardware.rs tables and check our tower permute() against it.
// constants copied independently from permutation.rs:185-206
const RC_SRC = [
  '0x0,0x1,0x0,0x3,0x7,0x7,0x6,0x6,0x2,0x1,0x7,0x2,0x2,0x3,0x3,0x2,0x6,0x5,0x7,0x5,0x0,0x2,0x2,0x3,0x1,0x5,0x2,0x6,0x1,0x4,0x1,0x0,0x3,0x7,0x2,0x0,0x1,0x2,0x4,0x1,0x0,0x0,0x2,0x5,0x7,0x2,0x0,0x4,0x1,0x5,0x5,0x1,0x2,0x7,0x3,0x1,0x0,0x1,0x3,0x7,0x1,0x6,0x1,0x6,0x6,0x2',
  '0x3,0x3,0x0,0x6,0x7,0x1,0x1,0x2,0x7,0x3,0x7,0x5,0x7,0x1,0x7,0x3,0x6,0x1,0x7,0x5,0x5,0x5,0x7,0x1,0x6,0x5,0x1,0x2,0x6,0x3,0x5,0x4,0x4,0x6,0x3,0x2,0x3,0x0,0x4,0x1,0x0,0x6,0x1,0x7,0x6,0x7,0x1,0x6,0x4,0x1,0x4,0x0,0x4,0x3,0x4,0x0,0x3,0x0,0x0,0x7,0x3,0x2,0x3,0x5,0x0,0x2',
  '0x6,0x0,0x5,0x3,0x2,0x5,0x6,0x5,0x6,0x7,0x2,0x7,0x6,0x4,0x1,0x0,0x6,0x3,0x2,0x6,0x2,0x1,0x5,0x3,0x1,0x7,0x7,0x6,0x7,0x1,0x1,0x4,0x4,0x4,0x6,0x2,0x5,0x4,0x0,0x3,0x1,0x4,0x1,0x6,0x1,0x6,0x7,0x7,0x6,0x2,0x7,0x3,0x3,0x3,0x0,0x2,0x6,0x4,0x0,0x0,0x0,0x3,0x1,0x4,0x1,0x5',
  '0x7,0x1,0x1,0x5,0x1,0x2,0x2,0x7,0x5,0x0,0x5,0x5,0x1,0x4,0x6,0x5,0x2,0x4,0x0,0x1,0x0,0x4,0x6,0x4,0x3,0x7,0x3,0x2,0x4,0x0,0x1,0x6,0x3,0x3,0x2,0x6,0x3,0x4,0x6,0x3,0x2,0x3,0x5,0x1,0x1,0x2,0x4,0x5,0x5,0x6,0x0,0x5,0x5,0x6,0x4,0x1,0x2,0x1,0x5,0x7,0x1,0x3,0x1,0x2,0x2,0x2'
].map((r) => r.split(',').map((x) => BigInt(x)));
const MF = [[5n, 7n, 1n, 3n], [4n, 6n, 1n, 1n], [1n, 3n, 5n, 7n], [1n, 1n, 4n, 6n]];
const MP = [[0x20n, 1n, 1n, 1n], [1n, 0x2000n, 1n, 1n], [1n, 1n, 0x200n, 1n], [1n, 1n, 1n, 0x800n]];
function flatPerm(stateTower) {
  const s = stateTower.map(t2f);
  const mds = (m) => { const inp = s.slice(); for (let i = 0; i < 4; i++) { let o = 0n; for (let j = 0; j < 4; j++) o ^= m[i][j] === 1n ? inp[j] : clmulGcm(inp[j], t2f(m[i][j])); s[i] = o; } };
  const sb = (x) => { const x2 = clmulGcm(x, x), x4 = clmulGcm(x2, x2); return clmulGcm(clmulGcm(x, x2), x4); };
  mds(MF);
  for (let r = 0; r < 66; r++) {
    if (r < 4 || r >= 62) { for (let i = 0; i < 4; i++) s[i] = sb(s[i] ^ t2f(RC_SRC[i][r])); mds(MF); }
    else { s[0] = sb(s[0] ^ t2f(RC_SRC[0][r])); mds(MP); }
  }
  return s.map(f2t);
}
const FIXTURES = [ // permutation.rs:243-257
  [0n, 0n, 0n, 0n],
  [1n, 0n, 1n, 0n],
  [0x0123456789abcdeffedcba9876543210n, 0xffff0000ffff0000aaaa5555aaaa5555n, 0x11112222333344445555666677778888n, 0xdeadbeefcafebabe0123456789abcdefn]
];
for (const f of FIXTURES) {
  const tower = I.permute(f.map(words)).map(big);
  const flat = flatPerm(f);
  ok('perm-tower=flat', tower.every((v, i) => v === flat[i]), 'fixture ' + f.map((x) => x.toString(16)).join(','));
}
for (let k = 0; k < 5; k++) {
  const st = [rnd128(), rnd128(), rnd128(), rnd128()];
  const tower = I.permute(st.map((x) => x.slice())).map(big);
  const flat = flatPerm(st.map(big));
  ok('perm-tower=flat', tower.every((v, i) => v === flat[i]), 'random state ' + k);
}

// --- 4. Poseidon2b sponge + compress: in-repo GOLDEN vectors -----------------
// noid_chain/src/exact_state_hash.rs:94-140 zero_root_golden_vectors_are_stable
//   Z0 = slot_leaf_hash(EMPTY): sponge(EXSTSLT_).absorb(0).absorb_pair(0,0).finalize()
//   Z{d+1} = compress_with_tag(EXSTNOD_, Zd, Zd)
const GOLD = {
  0: [129, 102, 210, 70, 24, 117, 164, 73, 150, 82, 163, 157, 56, 215, 196, 144, 152, 52, 131, 97, 217, 58, 221, 252, 173, 30, 138, 210, 158, 138, 112, 66],
  1: [6, 197, 99, 94, 29, 133, 197, 229, 174, 5, 238, 221, 187, 30, 247, 147, 65, 157, 47, 74, 14, 197, 144, 45, 189, 81, 132, 99, 44, 230, 81, 177],
  4: [170, 248, 23, 183, 124, 240, 4, 165, 25, 234, 105, 246, 1, 26, 145, 66, 37, 100, 219, 76, 136, 251, 74, 103, 231, 72, 51, 39, 246, 32, 50, 67],
  16: [83, 188, 60, 195, 138, 167, 135, 135, 217, 179, 116, 131, 126, 82, 131, 158, 8, 219, 2, 75, 184, 7, 169, 218, 53, 192, 1, 239, 60, 225, 155, 165],
  24: [92, 127, 55, 18, 97, 28, 131, 106, 44, 106, 176, 68, 141, 50, 194, 113, 240, 78, 50, 19, 86, 14, 138, 83, 33, 51, 28, 214, 165, 201, 132, 146],
  32: [198, 166, 100, 191, 38, 11, 167, 36, 137, 171, 94, 54, 102, 98, 128, 161, 43, 65, 20, 230, 75, 130, 35, 253, 184, 60, 150, 192, 56, 211, 164, 188]
};
{
  const s = new I.Sponge(I.capacityIv('EXSTSLT_'));
  s.absorb([0, 0, 0, 0]); s.absorbPair([0, 0, 0, 0], [0, 0, 0, 0]);
  let z = s.finalize();
  for (let d = 0; d <= 32; d++) {
    if (GOLD[d]) ok('poseidon2b-golden', hex(z) === hex(Uint8Array.from(GOLD[d])), 'exact_state zero root depth ' + d + ' got ' + hex(z));
    z = I.compressWithTag('EXSTNOD_', z, z);
  }
}
// domain.rs:182-185 tx8x2_tag_bytes_are_frozen: as_u64 == 0x5458_3858_325f_5f5f
{ const iv = I.capacityIv('TX8X2___'); ok('domain', big(iv[1]) === 0x54583858325f5f5fn && big(iv[0]) === (0x54583858325f5f5fn << 64n), 'TX8X2 label / capacity_iv layout'); }
// keystore.rs:89 "noid-deri" constant limbs
ok('domain', big(I.NOID_DERI) === 0x6E6F69642D64657269n, 'noid-deri constant');

// --- 5. BLAKE3 -------------------------------------------------------------
function b3input(n) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = i % 251; return b; }
for (const [n, h, dk] of B3_VECTORS) {
  const inp = b3input(n);
  ok('blake3-official', hex(I.blake3.hash(inp)) === h, 'hash len ' + n);
  ok('blake3-official', hex(I.blake3.deriveKey(B3_CONTEXT, inp)) === dk, 'derive_key len ' + n);
  // feed in awkward splits to exercise the streaming path
  const hh = I.blake3.deriveKeyHasher(B3_CONTEXT); let p = 0, step = 1;
  while (p < n) { hh.update(inp.subarray(p, Math.min(n, p + step))); p += step; step = (step * 7 + 3) % 1500 + 1; }
  ok('blake3-official', hex(hh.digest()) === dk, 'derive_key streamed len ' + n);
}
ok('blake3-official', hex(I.blake3.deriveKey(B3_CONTEXT, b3input(B3_EXT[0]), B3_EXT[1].length / 2)) === B3_EXT[1], 'extended output');
// in-repo: noid_gui/src/secret.rs:183-199 derive_image_secret(2,2,pixels)
{
  const px = Uint8Array.from([0x10, 0x20, 0x30, 0xff, 0x40, 0x50, 0x60, 0xff, 0x70, 0x80, 0x90, 0xff, 0xa0, 0xb0, 0xc0, 0xff]);
  // The golden in secret.rs:192 was computed by UPSTREAM under the context
  // "ParanO(1)d master secret from canonical image pixels v1" (see publish/kairos.patch:10539);
  // the fork renamed the context but did not regenerate the golden, so the Rust test is stale.
  // Reproducing it with the upstream context verifies the exact byte layout + BLAKE3 derive_key.
  const G = '8d96ff98f464d528b9a1dd123059276dd34bf9735a5c99e2dba17273a5f8286c';
  ok('photo-key', hex(I.deriveImageSecret(2, 2, px, 'ParanO(1)d master secret from canonical image pixels v1')) === G, 'secret.rs:192 golden (upstream context) reproduced');
  ok('photo-key', hex(I.deriveImageSecret(2, 2, px)) !== G, 'Kairos context differs from stale golden (expected)');
  console.log('  info: Kairos-context image secret for that 2x2 fixture = ' + hex(I.deriveImageSecret(2, 2, px)));
  const ch = px.slice(); ch[5] ^= 1;
  ok('photo-key', hex(I.deriveImageSecret(2, 2, ch, 'ParanO(1)d master secret from canonical image pixels v1')) !== G, 'pixel change changes secret');
}
{ // validation rules (secret.rs:110-127, tests :261-279)
  let e1 = ''; try { K.fromPixels(Uint8Array.from([255, 0, 0, 255]), 1, 1); } catch (e) { e1 = e.message; }
  ok('photo-key', e1.includes('at least 32 × 32 pixels'), 'tiny rejected');
  const uni = new Uint8Array(32 * 32 * 4); for (let i = 0; i < uni.length; i += 4) uni.set([0x22, 0x44, 0x66, 0xff], i);
  let e2 = ''; try { K.fromPixels(uni, 32, 32); } catch (e) { e2 = e.message; }
  ok('photo-key', e2.includes('at least 64 distinct pixel values'), 'uniform rejected');
  const px = new Uint8Array(32 * 32 * 4);
  for (let i = 0; i < 1024; i++) { const x = i % 32, y = (i / 32) | 0; px.set([(x * 7) & 255, (y * 5) & 255, ((x * 11) & 255) ^ y, 0xff], i * 4); }
  const r = K.fromPixels(px, 32, 32);
  ok('photo-key', /^[0-9a-f]{64}$/.test(r.masterHex) && /^[0-9a-f]{4}(·[0-9a-f]{4}){3}$/.test(r.keyId), 'fromPixels shape');
  ok('photo-key', r.keyId === K.keyId(r.masterHex), 'keyId consistent');
}

// --- 6. Bech32m ------------------------------------------------------------
// BIP-350 valid bech32m strings (also in bech32-0.11.1/tests/bip_350_test_vectors.rs:43-49)
for (const s of ['A1LQFN3A', 'a1lqfn3a', 'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6',
  'abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx', '11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8',
  'split1checkupstagehandshakeupstreamerranterredcaperredlc445v', '?1v759aa']) {
  let d = null; try { d = I.bech32Decode(s); } catch (e) { }
  ok('bech32m', d && d.variant === 'bech32m', 'BIP-350 valid ' + s);
  if (d) ok('bech32m', I.bech32Encode(d.hrp, d.data5, I.BECH32M_CONST) === s.toLowerCase(), 're-encode ' + s);
}
// BIP-350 segwit v1 address with 32-byte program: decode, re-encode bytes path
{
  const s = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
  const d = I.bech32Decode(s); const prog = I.convertBits(d.data5.slice(1), 5, 8, false);
  ok('bech32m', prog.length === 32 && I.bech32Encode('bc', [1].concat(I.convertBits(prog, 8, 5, true)), I.BECH32M_CONST) === s, 'BIP-350 P2TR 32-byte round trip');
}
// BIP-350 invalid: bech32 (not m) checksum on segwit v1 / known-bad strings
for (const s of ['an84characterslonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1569pvx', 'qyrz8wqd2c9m', '1qyrz8wqd2c9m', 'y1b0jsk6g', 'lt1igcx5c0', 'in1muywd', 'mm1crxm3i', 'au1s5cgom', 'M1VUXWEZ', '16plkw9', '1p2gdwpf']) {
  let threw = false; try { I.bech32Decode(s); } catch (e) { threw = true; }
  ok('bech32m', threw, 'BIP-350 invalid rejected ' + s);
}
// Address encoding (primitives.rs tests): 60 chars, k1 prefix, round trip, uppercase parse
{
  const raw = 'ec7c7a9a4dfff02df4275b1debf5d8fdc336307d8e895108b73f059923afcdb2';
  const a = K.encodeAddress(raw);
  ok('address-format', a.startsWith('k1') && a.length === 60, 'primitives.rs:455-478 k1 + 60 chars');
  ok('address-format', K.validateAddress(a).valid && K.validateAddress(a).hex === raw, 'round trip');
  ok('address-format', K.validateAddress(a.toUpperCase()).valid, 'uppercase parses (primitives.rs:487)');
  ok('address-format', !K.validateAddress(raw).valid, 'hex string rejected (primitives.rs:500)');
  const btc = I.bech32Encode('btc', I.convertBits(new Uint8Array(32), 8, 5, true), I.BECH32M_CONST);
  ok('address-format', /wrong address network/.test(K.validateAddress(btc).error || ''), 'wrong HRP rejected (primitives.rs:514)');
  for (const bad of ['notanaddress', '', 'o1', 'ab'.repeat(31)]) ok('address-format', !K.validateAddress(bad).valid, 'invalid rejected ' + JSON.stringify(bad));
}
// k1 addresses that appear in the repo GUI preview data (noid_gui/src/model.rs:746-766, backend.rs:3073)
for (const s of ['k12p4r8dl49ys3462zrqqys5vz8ll8m93su6lc70wu7rrwg3nn7fgs2mq8ug', 'k17z7pfmh09rjztwga8y9pzpy05ncznl5teqe23a48d0sumjcnrlas96y7r3',
  'k1ajnpfqtpkpugpwvpgjtkhk432fhd86l6vnvurgzn97hmvpcldpes7tpnee', 'k1mw9w0ak0kexrt8nge0d30wxqe2ghqah5m6fkqjkv3upjwfgpg02svgtplv']) {
  const v = K.validateAddress(s);
  ok('repo-k1-checksums', v.valid && v.variant === 'bech32m' && K.encodeAddress(v.hex) === s, 'repo address ' + s);
}
// upstream o1 strings (research/live_agents/.../adapter-tests.json) -> same 32 bytes re-encoded as k1
for (const s of ['o1asy20v8aag8nfkxgug0sh3hh2r8u9nka882gyhduh9t5vk73qlvq8psn29', 'o13m0pqc07m3c05zwf0pj6jex7wxn3v0fcxycnp9g5xwmx747sun6sk3ykpf']) {
  let d = null; try { d = I.bech32Decode(s); } catch (e) { }
  ok('repo-o1-checksums', d && d.hrp === 'o' && d.variant === 'bech32m', 'upstream o1 checksum ' + s);
}

// --- 7. Wallet derivation: structural checks (NO end-to-end KAT exists in repo) --
{
  const m = '07'.repeat(32);
  const ss = K.spendSecret(m, 0); const mb = unhex(m);
  ok('wallet-structure', /^[0-9a-f]{64}$/.test(ss), 'spend secret hex');
  ok('wallet-structure', K.address(m, 0) === K.addressFromSpendSecret(ss), 'address(master,i) == derive_address(spend_secret(master,i))');
  ok('wallet-structure', K.address(m, 0) !== K.address(m, 1), 'index changes address (keystore.rs:326)');
  ok('wallet-structure', K.address(m, 0) === K.address(m.toUpperCase().replace(/(..)/g, '$1 '), 0), 'hex whitespace/case normalisation');
  // permutation count / padding: spend secret = 3 permutations; manual replay
  const st = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  st[0] = I.fromLE(mb, 0); st[1] = I.fromLE(mb, 16); I.permute(st);
  st[0] = I.add128(st[0], [0, 0, 0, 0]); st[1] = I.add128(st[1], I.NOID_DERI); I.permute(st);
  st[0] = I.add128(st[0], [0x80, 0, 0, 0]); st[1] = I.add128(st[1], [0, 0, 0, 0x01000000]); I.permute(st);
  const out = new Uint8Array(32); I.toLE(st[0], out, 0); I.toLE(st[1], out, 16);
  ok('wallet-structure', hex(out) === ss, 'manual 3-permutation replay of derive_spend_secret');
  const iv = I.capacityIv('ADDRFIX_'); const a = [I.fromLE(out, 0), I.fromLE(out, 16), iv[0], iv[1]]; I.permute(a);
  const ab = new Uint8Array(32); I.toLE(a[0], ab, 0); I.toLE(a[1], ab, 16);
  ok('wallet-structure', K.encodeAddress(hex(ab)) === K.address(m, 0), 'manual 1-permutation replay of derive_address');
  console.log('  sample: master 07*32 -> index0 spend ' + ss + '\n          address ' + K.address(m, 0));
}
{ const r = K.randomMaster(); ok('wallet-structure', /^[0-9a-f]{64}$/.test(r) && K.validateAddress(K.address(r)).valid, 'randomMaster -> valid address'); }

// --- report ---------------------------------------------------------------
console.log('\nKairosKeys known-answer tests');
for (const [g, [p, f]] of Object.entries(groups)) console.log('  ' + g.padEnd(22) + p + ' pass' + (f ? ', ' + f + ' FAIL' : ''));
console.log('TOTAL ' + pass + ' pass, ' + fail + ' fail');
console.log('NOTE: no in-repo end-to-end (master|secret -> k1 address) known-answer vector exists;\n      address correctness rests on the verified permutation + sponge goldens above.');
process.exit(fail ? 1 : 0);
