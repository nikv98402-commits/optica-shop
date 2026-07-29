from __future__ import annotations

import argparse
import json
import sys
from itertools import islice
from pathlib import Path
from typing import Any

from .config import canonical_hash, load_config, load_taxonomy
from .dedupe import deduplicate
from .models import Candidate, Decision, Status
from .probe import iter_source, probe_source
from .report import load_report
from .select import evaluate
from .validate import validate_run
from .writer import write_outputs

MODULE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = MODULE_ROOT / "configs" / "corpus.yaml"
DEFAULT_TAXONOMY = MODULE_ROOT / "configs" / "taxonomy.yaml"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vilu-corpus")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--taxonomy", default=str(DEFAULT_TAXONOMY))
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("probe", help="Verify the pinned source schema without logging text")
    build = subparsers.add_parser("build", help="Build a deterministic bounded corpus run")
    build.add_argument("--limit", type=_positive_int, required=True)
    build.add_argument("--output", type=Path, required=True)
    validate = subparsers.add_parser("validate", help="Validate hashes, licenses and referential integrity")
    validate.add_argument("--output", type=Path, required=True)
    report = subparsers.add_parser("report", help="Print aggregate run metadata only")
    report.add_argument("--output", type=Path, required=True)
    return parser


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    try:
        config = load_config(args.config)
        taxonomy = load_taxonomy(args.taxonomy)
        if args.command == "probe":
            result = probe_source(_resolved_source(config.source, conf×8ß{h‘éì¶»§q«^v628fecba270045c9701b0c564563a9b0577d24a4ec75b8ab8040f", size = 115780, upload-time = "2026-07-20T02:06:09.599Z" },
    { url = "https://files.pythonhosted.org/packages/58/86/1f94664e147474337e3359f52012cf3d02f825f694317b178bfba1078c62/yarl-1.24.5-cp313-cp313-manylinux2014_s390x.manylinux_2_17_s390x.manylinux_2_28_s390x.whl", hash = "sha256:fcd3b77e2f17bbe4ca56ec7bcb07992647d19d0b9c05d84886dcd6f9eb810afd", size = 115308, upload-time = "2026-07-20T02:06:11.352Z" },
    { url = "https://files.pythonhosted.org/packages/0a/43/8e55ae7538ba5f28ccb3c845c6dd4549cf7016d5992e5326512519107cdd/yarl-1.24.5-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl", hash = "sha256:d46b86567dd4e248c6c159fcbcdcce01e0a5c8a7cd2334a0fff759d0fa075b16", size = 110574, upload-time = "2026-07-20T02:06:13.129Z" },
    { url = "https://files.pythonhosted.org/packages/ce/ba/a889ec8765cedcf2ac44dcb02d6a21e4861399b243b263c5f2dde27ee740/yarl-1.24.5-cp313-cp313-manylinux_2_31_riscv64.manylinux_2_39_riscv64.whl", hash = "sha256:7f72c74aa99359e27a2ee8d6613fefa28b5f76a983c083074dfc2aaa4ab46213", size = 109914, upload-time = "2026-07-20T02:06:15.243Z" },
    { url = "https://files.pythonhosted.org/packages/9c/c3/e45f821af67b791c2dbbe4a9f4137a1d33f8d386654a05a0c3f47bdfa25d/yarl-1.24.5-cp313-cp313-musllinux_1_2_aarch64.whl", hash = "sha256:3f45789ce415a7ec0820dc4f82925f9b5f7732070be1dec1f5f23ec381435a24", size = 107712, upload-time = "2026-07-20T02:06:17.443Z" },
    { url = "https://files.pythonhosted.org/packages/02/00/2ab0f42c9857fcb490bfaa6647b14540b53d241ab209f23220b958cc5832/yarl-1.24.5-cp313-cp313-musllinux_1_2_armv7l.whl", hash = "sha256:6e73e7fe93f17a7b191f52ec9da9dd8c06a8fe735a1ecbd13b97d1c723bff385", size = 104251, upload-time = "2026-07-20T02:06:19.259Z" },
    { url = "https://files.pythonhosted.org/packages/7a/70/709d9a286e98af2c7fd8e4e6cada658b5c0e30d87dd7e2a63c2fb5767217/yarl-1.24.5-cp313-cp313-musllinux_1_2_ppc64le.whl", hash = "sha256:4a36f9becdd4c5c52a20c3e9484128b070b1dcfc8944c006f3a528295a359a9c", size = 115319, upload-time = "2026-07-20T02:06:21.207Z" },
    { url = "https://files.pythonhosted.org/packages/5c/6c/3eaa515142991fe84cfc483ff986492211f1978f90161ccefdbec919d09b/yarl-1.24.5-cp313-cp313-musllinux_1_2_riscv64.whl", hash = "sha256:7bcbe0fcf850eae67b6b01749815a4f7161c560a844c769ad7b48fcd99f791c4", size = 109163, upload-time = "2026-07-20T02:06:23.006Z" },
    { url = "https://files.pythonhosted.org/packages/bb/64/711dafce66c323a3144d470547a71c5384c57623308ac8bb5e4b903ac148/yarl-1.24.5-cp313-cp313-musllinux_1_2_s390x.whl", hash = "sha256:24e861e9630e0daddcb9191fb187f60f034e17a4426f8101279f0c475cd74144", size = 115435, upload-time = "2026-07-20T02:06:24.923Z" },
    { url = "https://files.pythonhosted.org/packages/cf/f3/9b9d0e6d84bea851eb1ba99e4bdc755b86fd813e49ec86dfe42f26befdef/yarl-1.24.5-cp313-cp313-musllinux_1_2_x86_64.whl", hash = "sha256:9335a099ad87287c37fe5d1a982ff392fa5efe5d14b40a730b1ec1d6a41382b4", size = 110691, upload-time = "2026-07-20T02:06:26.973Z" },
    { url = "https://files.pythonhosted.org/packages/86/e4/62a06b7e87c4246ac76b7c2da136f972eb4a3a1fc94abb07e7022d6fdb0a/yarl-1.24.5-cp313-cp313-win_amd64.whl", hash = "sha256:2dbe06fc16bc91502bca713704022182e5729861ae00277c3a23354b40929740", size = 97454, upload-time = "2026-07-20T02:06:29.163Z" },
    { url = "https://files.pythonhosted.org/packages/9e/c9/5fc8025b318ab10db413b61056bd0d95c557a70e8df4210c7511f866329c/yarl-1.24.5-cp313-cp313-win_arm64.whl", hash = "sha256:6b8536851f9f65e7f00c7a1d49ba7f2be0ffe2c11555367fc9f50d9f842410a1", size = 92813, upload-time = "2026-07-20T02:06:31.113Z" },
    { url = "https://files.pythonhosted.org/packages/a9/08/5f3085fef9564217074db9dd8573de1795bc82cde61a7ad10b6a7234a569/yarl-1.24.5-cp314-cp314-macosx_10_15_universal2.whl", hash = "sha256:2729fcfc4f6a596fb0c50f32090400aa9367774ac296a00387e65098c0befa76", size = 135680, upload-time = "2026-07-20T02:06:33.273Z" },
    { url = "https://files.pythonhosted.org/packages/98/35/ba9436e579bd48a8801f2021d842d9ab4994c26e4c7dd3a4c1f1bcb57a9e/yarl-1.24.5-cp314-cp314-macosx_10_15_x86_64.whl", hash = "sha256:ff330d3c30db4eb6b01d79e29d2d0b407a7ecad39cfd9ec993ece57396a2ec0d", size = 97395, upload-time = "2026-07-20T02:06:35.259Z" },
    { url = "https://files.pythonhosted.org/packages/18/a9/a07f76f3c44e02b25cc743af5ef93eef27f7013eadca770451b6a6ccb5db/yarl-1.24.5-cp314-cp314-macosx_11_0_arm64.whl", hash = "sha256:e42d75862735da90e7fc5a7b23db0c976f737113a54b3c9777a9b665e9cbff75", size = 97223, upload-time = "2026-07-20T02:06:37.216Z" },
    { url = "https://files.pythonhosted.org/packages/77/f7/a9a1d6fa7dd9e388f95b30f6ad3ec4e285f6c8f61f44ce16070c3fcfe414/yarl-1.24.5-cp314-cp314-manylinux2014_aarch64.manylinux_2_17_aarch64.manylinux_2_28_aarch64.whl", hash = "sha256:a3732e66413163e72508da9eff9ce9d2846fde51fae45d3605393d3e6cd303e9", size = 108777, upload-time = "2026-07-20T02:06:39.292Z" },
    { url = "https://files.pythonhosted.org/packages/2f/44/e0b86c302471fabd6f02808ecf2ac52b8412b624787849d4bf2cdb466f6f/yarl-1.24.5-cp314-cp314-manylinux2014_armv7l.manylinux_2_17_armv7l.manylinux_2_31_armv7l.whl", hash = "sha256:5b8ee53be440a0cffc991a27be3057e0530122548dbe7c0892df08822fce5ede", size = 103119, upload-time = "2026-07-20T02:06:41.456Z" },
    { url = "https://files.pythonhosted.org/packages/d1/16/9c16d180bf8faaf223225eb50e1245870ff1ae0e302a27153988e65c51fd/yarl-1.24.5-cp314-cp314-manylinux2014_ppc64le.manylinux_2_17_ppc64le.manylinux_2_28_ppc64le.whl", hash = "sha256:af3aefa655adb5869491fa907e652290386800ae99cc50095cba71e2c6aefdca", size = 116471, upload-time = "2026-07-20T02:06:43.696Z" },
    { url = "https://files.pythonhosted.org/packages/d2/8d/b219b9df28a02ce95cfbdd41d2f7caa5669d0ff979c1c9975697145e33c5/yarl-1.24.5-cp314-cp314-manylinux2014_s390x.manylinux_2_17_s390x.manylinux_2_28_s390x.whl", hash = "sha256:2120b96872df4a117cde97d270bac96aea7cc52205d305cf4611df694a487027", size = 115974, upload-time = "2026-07-20T02:06:45.874Z" },
    { url = "https://files.pythonhosted.org/packages/9b/e8/f20557aca240d88e69850ad1ee91756821d094bb1310565c04d25c6682a2/yarl-1.24.5-cp314-cp314-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl", hash = "sha256:66410eb6345d467151934b49bfa70fb32f5b35a6140baa40ad97d6436abea2e9", size = 110830, upload-time = "2026-07-20T02:06:47.852Z" },
    { url = "https://files.pythonhosted.org/packages/db/18/199b85109a53eeca64ee19c9cca228287e8e4ab0cc1a09b28f530e65cce0/yarl-1.24.5-cp314-cp314-manylinux_2_31_riscv64.manylinux_2_39_riscv64.whl", hash = "sha256:4af7b7e1be0a69bee8210735fe6dcfc38879adfac6d62e789d53ba432d1ffa41", size = 110054, upload-time = "2026-07-20T02:06:49.84Z" },
    { url = "https://files.pythonhosted.org/packages/aa/2f/ed28147f8cd7f48c49367c90713b30a555284b6105a6a56f3a05568da795/yarl-1.24.5-cp314-cp314-musllinux_1_2_aarch64.whl", hash = "sha256:fa139875ff98ab97da323cfadfaff08900d1ad42f1b5087b0b812a55c5a06373", size = 108312, upload-time = "2026-07-20T02:06:51.835Z" },
    { url = "https://files.pythonhosted.org/packages/c5/c5/55e16ae0a5c227cea8df1c6871ba57d614a34243146c05729caf2a1bd9c5/yarl-1.24.5-cp314-cp314-musllinux_1_2_armv7l.whl", hash = "sha256:0055afc45e864b92729ac7600e2d102c17bef060647e74bca75fa84d66b9ff36", size = 103662, upload-time = "2026-07-20T02:06:54.061Z" },
    { url = "https://files.pythonhosted.org/packages/8d/ea/dbd7c2caec459c9a426f18b02688ecbfb58620d0f6a3422d24769fbaf8ab/yarl-1.24.5-cp314-cp314-musllinux_1_2_ppc64le.whl", hash = "sha256:f0e466ed7511fe9d459a819edbc6c2585c0b6eabde9fa8a8947552468a7a6ef0", size = 116090, upload-time = "2026-07-20T02:06:56.015Z" },
    { url = "https://files.pythonhosted.org/packages/06/84/39ce4ce3059e07fece5fbdbee8c4053406af9aca911ce9fa5f8548aab6af/yarl-1.24.5-cp314-cp314-musllinux_1_2_riscv64.whl", hash = "sha256:f141474e85b7e54998ec5180530a7cda99ab29e282fa50e0756d89981a9b43c5", size = 109523, upload-time = "2026-07-20T02:06:57.926Z" },
    { url = "https://files.pythonhosted.org/packages/a9/8b/71ff44137b405c64a7788075669c24010019f57a7464b78c3a6cbee539d9/yarl-1.24.5-cp314-cp314-musllinux_1_2_s390x.whl", hash = "sha256:e2935f8c39e3b03e83519292d78f075189978f3f4adc15a78144c7c8e2a1cba5", size = 116084, upload-time = "2026-07-20T02:06:59.868Z" },
    { url = "https://files.pythonhosted.org/packages/62/c0/423078fdd4042e1862c11f0ffd977a0ffa393783c12bee94685923bc189e/yarl-1.24.5-cp314-cp314-musllinux_1_2_x86_64.whl", hash = "sha256:9d1216a7f6f77836617dba35687c5b78a4170afc3c3f18fc788f785ba26565c4", size = 111006, upload-time = "2026-07-20T02:07:01.907Z" },
    { url = "https://files.pythonhosted.org/packages/cf/52/6daa2ee9d95e5c98b8128f8df91eb692eb423ab274b8cf08db52152fad26/yarl-1.24.5-cp314-cp314-win_amd64.whl", hash = "sha256:5ba4f78df2bcc19f764a4b26a8a4f5049c110090ad5825993aacb052bf8003ad", size = 99215, upload-time = "2026-07-20T02:07:03.852Z" },
    { url = "https://files.pythonhosted.org/packages/ec/0e/464a847d7359e0da75dd9fc5c1d1aa35d0159ea31e5f8e66a3c1c29ff3d0/yarl-1.24.5-cp314-cp314-win_arm64.whl", hash = "sha256:9e4e16c73d717c5cf27626c524d0a2e261ad20e46932b2670f64ad5dde23e26f", size = 94566, upload-time = "2026-07-20T02:07:06.074Z" },
    { url = "https://files.pythonhosted.org/packages/e2/55/e03acc4446772660bc335e86e41ef31e4d0d838fd641531a11a5ee33b493/yarl-1.24.5-cp314-cp314t-macosx_10_15_universal2.whl", hash = "sha256:e1ae548a9d901adca07899a4147a7c826bbcc06239d3ce9a59f57886a28a4c88", size = 142533, upload-time = "2026-07-20T02:07:08.284Z" },
    { url = "https://files.pythonhosted.org/packages/ae/71/4acd3a1fc7cf14345cdb302665ecd2097f62c365b4f14ca17d4f37775cf9/yarl-1.24.5-cp314-cp314t-macosx_10_15_x86_64.whl", hash = "sha256:ff405d91509d88e8d44129cd87b18d70acd1f0c1aeabd7bc3c46792b1fe2acba", size = 100776, upload-time = "2026-07-20T02:07:10.197Z" },
    { url = "https://files.pythonhosted.org/packages/ff/0b/cfb76b7fe99686db264bff829779a539d923e7564ffd7ef18da6c54c3774/yarl-1.24.5-cp314-cp314t-macosx_11_0_arm64.whl", hash = "sha256:47e98aab9d8d82ff682e7b0b5dded33bf138a32b817fcf7fa3b27b2d7c412928", size = 100913, upload-time = "2026-07-20T02:07:12.357Z" },
    { url = "https://files.pythonhosted.org/packages/8b/3f/7116e782992abbd4fb6948488aec72078895e929a23078290739e8396fce/yarl-1.24.5-cp314-cp314t-manylinux2014_aarch64.manylinux_2_17_aarch64.manylinux_2_28_aarch64.whl", hash = "sha256:f0a658a6d3fafee5c6f63c58f3e785c8c43c93fbc02bf9f2b6663f8185e0971f", size = 106507, upload-time = "2026-07-20T02:07:14.173Z" },
    { url = "https://files.pythonhosted.org/packages/33/90/d4d2d73ee78229cc889872eb8e085d8f5c6f51abdb178409fd9b23cf74fd/yarl-1.24.5-cp314-cp314t-manylinux2014_armv7l.manylinux_2_17_armv7l.manylinux_2_31_armv7l.whl", hash = "sha256:4377407001ca3c057773f44d8ddd6358fa5f691407c1ba92210bd3cf8d9e4c95", size = 99219, upload-time = "2026-07-20T02:07:16.019Z" },
    { url = "https://files.pythonhosted.org/packages/3e/fa/a6df1a9bccd644eec00abee0dff4277416222cec435330fd1f2858523ec1/yarl-1.24.5-cp314-cp314t-manylinux2014_ppc64le.manylinux_2_17_ppc64le.manylinux_2_28_ppc64le.whl", hash = "sha256:7c0494a31a1ac5461a226e7947a9c9b78c44e1dc7185164fa7e9651557a5d9bc", size = 111804, upload-time = "2026-07-20T02:07:18.141Z" },
    { url = "https://files.pythonhosted.org/packages/8a/9e/7b2a1f4bcc20e9447156dd2b1c4d01f70d9df0759025ee7d09a84ffae134/yarl-1.24.5-cp314-cp314t-manylinux2014_s390x.manylinux_2_17_s390x.manylinux_2_28_s390x.whl", hash = "sha256:a7cff474ab7cd149765bb784cf6d78b32e18e20473fb7bda860bce98ab58e9da", size = 110943, upload-time = "2026-07-20T02:07:20.06Z" },
    { url = "https://files.pythonhosted.org/packages/08/ff/22c92affb0f9b623ca753d27d968b5625b868f12c6378d049d55ae247643/yarl-1.24.5-cp314-cp314t-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl", hash = "sha256:cbb833ccacdb5519eff9b8b71ee618cc2801c878e77e288775d77c3a2ced858a", size = 108251, upload-time = "2026-07-20T02:07:22.217Z" },
    { url = "https://files.pythonhosted.org/packages/45/44/5769b96298c1e195fb412997b6090af2a84105cf59c17613558a2d011d1f/yarl-1.24.5-cp314-cp314t-manylinux_2_31_riscv64.manylinux_2_39_riscv64.whl", hash = "sha256:82f75e05912e84b7a0fe57075d9c59de3cb352b928330f2eb69b2e1f54c3e1f0", size = 106025, upload-time = "2026-07-20T02:07:24.083Z" },
    { url = "https://files.pythonhosted.org/packages/4c/40/009e8e791fd9762c0e1567e69248acb4f49064597e1680874c16dd8bb798/yarl-1.24.5-cp314-cp314t-musllinux_1_2_aarch64.whl", hash = "sha256:16a2f5010280020e90f5330257e6944bc33e73593b136cc5a241e6c1dc292498", size = 106573, upload-time = "2026-07-20T02:07:26.248Z" },
    { url = "https://files.pythonhosted.org/packages/20/c6/b7480578f8a0a80946f36ad6df547ecec704f9ba69d2de60f8aa6f1c1cbf/yarl-1.24.5-cp314-cp314t-musllinux_1_2_armv7l.whl", hash = "sha256:ffcd54362564dc1a30fb74d8b8a6e5a6b11ebd5e27266adc3b7427a21a6c9104", size = 100751, upload-time = "2026-07-20T02:07:28.098Z" },
    { url = "https://files.pythonhosted.org/packages/d4/27/4476f3360b91a48c5cf125e91f59a3bd35299d84a431a258d57f5977bb11/yarl-1.24.5-cp314-cp314t-musllinux_1_2_ppc64le.whl", hash = "sha256:0465ec8cedc2349b97a6b595ace64084a50c6e839eca40aa0626f38b8350e331", size = 111643, upload-time = "2026-07-20T02:07:30.88Z" },
    { url = "https://files.pythonhosted.org/packages/4c/4b/5cdd3e5ee944e8af31e52f6cd3d3af5fd7b937e036ccbbba2c9ffebede95/yarl-1.24.5-cp314-cp314t-musllinux_1_2_riscv64.whl", hash = "sha256:4db9aecb141cb7a5447171b57aa1ed3a8fee06af40b992ffc31206c0b0121550", size = 106312, upload-time = "2026-07-20T02:07:33.06Z" },
    { url = "https://files.pythonhosted.org/packages/18/86/f406b0c2a6f99575de2da671ef47aa06f89a5be83a27a46971c3b86cecdb/yarl-1.24.5-cp314-cp314t-musllinux_1_2_s390x.whl", hash = "sha256:f540c013589084679a6c7fac07096b10159737918174f5dfc5e11bf5bca4dfe6", size = 110379, upload-time = "2026-07-20T02:07:35.155Z" },
    { url = "https://files.pythonhosted.org/packages/f0/6c/9f3adfbd3b30b4fa0f7ccb3a83eba2c1152d3fff554d535e640ba0f7ba2b/yarl-1.24.5-cp314-cp314t-musllinux_1_2_x86_64.whl", hash = "sha256:a61834fb15d81322d872eaafd333838ae7c9cea84067f232656f75965933d047", size = 108497, upload-time = "2026-07-20T02:07:37.35Z" },
    { url = "https://files.pythonhosted.org/packages/dd/37/91eb2e5ca883a529c1b390348a74cd9fc0512171727f547ce70bfe02be5c/yarl-1.24.5-cp314-cp314t-win_amd64.whl", hash = "sha256:5c88e5815a49d289e599f3513aa7fde0bc2092ff188f99c940f007f90f53d104", size = 102450, upload-time = "2026-07-20T02:07:39.578Z" },
    { url = "https://files.pythonhosted.org/packages/bf/f4/ed5c402ac8fde4403ed3366c2716bfddc8a6677ebd59f3d62772cc7fe468/yarl-1.24.5-cp314-cp314t-win_arm64.whl", hash = "sha256:cf139c02f5f23ef6532040a30ff662c00a318c952334f211046b8e60b7f17688", size = 97222, upload-time = "2026-07-20T02:07:41.55Z" },
    { url = "https://files.pythonhosted.org/packages/61/02/962c1cbfc401a30c1d034dc67ff395f64b52302c6d62de556c1fca99acc0/yarl-1.24.5-py3-none-any.whl", hash = "sha256:a33700d13d9b7d84fd10947b09ff69fb9a792e519c8cb9764a3ca70baa6c23a7", size = 58612, upload-time = "2026-07-20T02:07:43.461Z" },
]
