import path from 'path';

// ===================================================================
// TODO: 您需要根据您的配置填充这些数据
// ===================================================================

/**
 * 对应 Python 中的 ManualConfig.OUMEI_NAME。
 * 这是一个从短名称到长名称的映射。
 */
const OUMEI_NAME: Record<string, string> = {
  "wgp": "WhenGirlsPlay",
  "18og": "18OnlyGirls",
  "18yo": "18YearsOld",
  "1kf": "1000Facials",
  "21ea": "21EroticAnal",
  "21fa": "21FootArt",
  "21n": "21Naturals",
  "2cst": "2ChicksSameTime",
  "a1o1": "Asian1on1",
  "aa": "AmateurAllure",
  "ad": "AmericanDaydreams",
  "add": "ManualAddActors",
  "agm": "AllGirlMassage",
  "am": "AssMasterpiece",
  "analb": "AnalBeauty",
  "baebz": "Baeb",
  "bblib": "BigButtsLikeItBig",
  "bcasting": "BangCasting",
  "bconfessions": "BangConfessions",
  "bglamkore": "BangGlamkore",
  "bgonzo": "BangGonzo",
  "brealteens": "BangRealTeens",
  "bcb": "BigCockBully",
  "bch": "BigCockHero",
  "bdpov": "BadDaddyPOV",
  "bex": "BrazzersExxtra",
  "bgb": "BabyGotBoobs",
  "bgbs": "BoundGangbangs",
  "bin": "BigNaturals",
  "bjf": "BlowjobFridays",
  "bp": "ButtPlays",
  "btas": "BigTitsatSchool",
  "btaw": "BigTitsatWork",
  "btc": "BigTitCreampie",
  "btis": "BigTitsinSports",
  "btiu": "BigTitsinUniform",
  "btlbd": "BigTitsLikeBigDicks",
  "btra": "BigTitsRoundAsses",
  "burna": "BurningAngel",
  "bwb": "BigWetButts",
  "cfnm": "ClothedFemaleNudeMale",
  "clip": "LegalPorno",
  "cps": "CherryPimps",
  "cuf": "CumFiesta",
  "cws": "CzechWifeSwap",
  "da": "DoctorAdventures",
  "dbm": "DontBreakMe",
  "dc": "DorcelVision",
  "ddfb": "DDFBusty",
  "ddfvr": "DDFNetworkVR",
  "dm": "DirtyMasseur",
  "dnj": "DaneJones",
  "dpg": "DigitalPlayground",
  "dwc": "DirtyWivesClub",
  "dwp": "DayWithAPornstar",
  "dsw": "DaughterSwap",
  "esp": "EuroSexParties",
  "ete": "EuroTeenErotica",
  "ext": "ExxxtraSmall",
  "fams": "FamilyStrokes",
  "faq": "FirstAnalQuest",
  "fds": "FakeDrivingSchool",
  "fft": "FemaleFakeTaxi",
  "fhd": "FantasyHD",
  "fhl": "FakeHostel",
  "fho": "FakehubOriginals",
  "fka": "FakeAgent",
  "fm": "FuckingMachines",
  "fms": "FantasyMassage",
  "frs": "FitnessRooms",
  "ft": "FastTimes",
  "ftx": "FakeTaxi",
  "gft": "GrandpasFuckTeens",
  "gbcp": "GangbangCreampie",
  "gta": "GirlsTryAnal",
  "gw": "GirlsWay",
  "h1o1": "Housewife1on1",
  "ham": "HotAndMean",
  "hart": "Hegre",
  "hcm": "HotCrazyMess",
  "hegre-art": "Hegre",
  "hoh": "HandsOnHardcore",
  "hotab": "HouseofTaboo",
  "ht": "Hogtied",
  "ihaw": "IHaveAWife",
  "iktg": "IKnowThatGirl",
  "il": "ImmoralLive",
  "kha": "KarupsHA",
  "kow": "KarupsOW",
  "kpc": "KarupsPC",
  "la": "LatinAdultery",
  "lcd": "LittleCaprice-Dreams",
  "littlecaprice": "LittleCaprice-Dreams",
  "lhf": "LoveHerFeet",
  "lsb": "Lesbea",
  "lst": "LatinaSexTapes",
  "lta": "LetsTryAnal",
  "maj": "ManoJob",
  "mbb": "MommyBlowsBest",
  "mbt": "MomsBangTeens",
  "mc": "MassageCreep",
  "mcu": "MonsterCurves",
  "mdhf": "MyDaughtersHotFriend",
  "mdhg": "MyDadsHotGirlfriend",
  "mfa": "ManuelFerrara",
  "mfhg": "MyFriendsHotGirl",
  "mfhm": "MyFriendsHotMom",
  "mfl": "Mofos",
  "mfp": "MyFamilyPies",
  "mfst": "MyFirstSexTeacher",
  "mgbf": "MyGirlfriendsBustyFriend",
  "mgb": "MommyGotBoobs",
  "mic": "MomsInControl",
  "mj": "ManoJob",
  "mlib": "MildsLikeItBig",
  "mlt": "MomsLickTeens",
  "mmgs": "MommysGirl",
  "mnm": "MyNaughtyMassage",
  "mom": "MomXXX",
  "mpov": "MrPOV",
  "mrs": "MassageRooms",
  "mshf": "MySistersHotFriend",
  "mts": "MomsTeachSex",
  "mvft": "MyVeryFirstTime",
  "mwhf": "MyWifesHotFriend",
  "naf": "NeighborAffair",
  "nam": "NaughtyAmerica",
  "na": "NaughtyAthletics",
  "naughtyamericavr": "NaughtyAmerica",
  "nb": "NaughtyBookworms",
  "news": "NewSensations",
  "nf": "NubileFilms",
  "no": "NaughtyOffice",
  "nrg": "NaughtyRichGirls",
  "nubilef": "NubileFilms",
  "num": "NuruMassage",
  "nw": "NaughtyWeddings",
  "obj": "OnlyBlowjob",
  "otb": "OnlyTeenBlowjobs",
  "pav": "PixAndVideo",
  "pba": "PublicAgent",
  "pf": "PornFidelity",
  "phd": "PassionHD",
  "plib": "PornstarsLikeitBig",
  "pop": "PervsOnPatrol",
  "ppu": "PublicPickups",
  "prdi": "PrettyDirty",
  "ps": "PropertySex",
  "pud": "PublicDisgrace",
  "reg": "RealExGirlfriends",
  "rkp": "RKPrime",
  "rws": "RealWifeStories",
  "saf": "ShesAFreak",
  "sart": "SexArt",
  "sbj": "StreetBlowjobs",
  "sislove": "SisLovesMe",
  "smb": "ShareMyBF",
  "ssc": "StepSiblingsCaught",
  "ssn": "ShesNew",
  "sts": "StrandedTeens",
  "swsn": "SwallowSalon",
  "tdp": "TeensDoPorn",
  "tds": "TheDickSuckers",
  "ted": "Throated",
  "tf": "TeenFidelity",
  "tgs": "ThisGirlSucks",
  "these": "TheStripperExperience",
  "tla": "TeensLoveAnal",
  "tlc": "TeensLoveCream",
  "tle": "TheLifeErotic",
  "tlhc": "TeensLoveHugeCocks",
  "tlib": "TeensLikeItBig",
  "tlm": "TeensLoveMoney",
  "togc": "TonightsGirlfriendClassic",
  "tog": "TonightsGirlfriend",
  "tspa": "TrickySpa",
  "tss": "ThatSitcomShow",
  "tuf": "TheUpperFloor",
  "wa": "WhippedAss",
  "wfbg": "WeFuckBlackGirls",
  "wkp": "Wicked",
  "wlt": "WeLiveTogether",
  "woc": "WildOnCam",
  "wov": "WivesOnVacation",
  "wowg": "WowGirls",
  "wy": "WebYoung",
  "zzs": "ZZseries",
  "ztod": "ZeroTolerance",
  "itc": "InTheCrack",
  "abbw": "AbbyWinters",
  "abme": "AbuseMe",
  "ana": "AnalAngels",
  "atke": "ATKExotics",
  "atkg": "ATKGalleria",
  "atkgfs": "ATKGirlfriends",
  "atkh": "ATKHairy",
  "aktp": "ATKPetites",
  "btp": "BadTeensPunished",
  "brealmilfs": "Bang.RealMilfs",
  "byngr": "bang.YNGR",
  "ba": "Beauty-Angels",
  "bgfs": "BlackGFS",
  "bna": "BrandNew",
  "bam": "BruceAndMorgan",
  "bcast": "BrutalCastings",
  "bd": "BrutalDildos",
  "bpu": "BrutalPickups",
  "clubseventeen": "ClubSweethearts",
  "cfnmt": "CFNMTeens",
  "cfnms": "FNMSecret",
  "cza": "CzhecAmateurs",
  "czbb": "CzechBangBus",
  "czb": "CzechBitch",
  "cc": "CzechCasting",
  "czc": "CzechCouples",
  "czestro": "CzechEstrogenolit",
  "czf": "CzechFantasy",
  "czgb": "CzechGangBang",
  "cgfs": "CzechGFS",
  "czharem": "CzechHarem",
  "czm": "CzechMassage",
  "czo": "CzechOrgasm",
  "czps": "CzechPawnShop",
  "css": "CzechStreets",
  "cztaxi": "CzechTaxi",
  "czt": "CzechTwins",
  "dlla": "DadysLilAngel",
  "dts": "DeepThroatSirens",
  "deb": "DeviceBondage",
  "doan": "DiaryOfANanny",
  "dpf": "DPFanatics",
  "ds": "DungeonSex",
  "ffr": "FacialsForever",
  "ff": "FilthyFamily",
  "fbbg": "FirstBGG",
  "fab": "FuckedAndBound",
  "fum": "FuckingMachines",
  "fs": "FuckStudies",
  "tfcp": "FullyClothedPissing",
  "gfr": "GFRevenge",
  "gdp": "GirlsDoPorn",
  "hletee": "HelplessTeens",
  "hotb": "HouseOfTaboo",
  "Infr": "InfernalRestraints",
  "inh": "InnocentHigh",
  "jlmf": "JessieLoadsMonsterFacials",
  "university": "KinkUniversity",
  "lang": "LANewGirl",
  "mmp": "MMPNetwork",
  "mot": "MoneyTalks",
  "mbc": "MyBabysittersClub",
  "mdm": "MyDirtyMaid",
  "nvg": "NetVideoGirls",
  "nubp": "Nubiles-Porn",
  "oo": "Only-Opaques",
  "os": "Only-Secretaries",
  "oss": "OnlySilAndSatin",
  "psus": "PascalsSubSluts",
  "pbf": "PetiteBallerinasFucked",
  "phdp": "PetiteHDPoorn",
  "psp": "PorsntarsPunishment",
  "pc": "PrincessCum",
  "pdmqfo": "QuestForOrgasm",
  "rtb": "RealTimeBondage",
  "rab": "RoundAndBrown",
  "sr": "SadisticRope",
  "sas": "SexAndSubmission",
  "sed": "SexualDisgrace",
  "seb": "SexuallyBroken",
  "sislov": "SisLovesMe",
  "tslw": "SlimeWave",
  "steps": "StepSiblings",
  "stre": "StrictRestraint",
  "t18": "Taboo18",
  "tft": "TeacherFucksTeens",
  "tmf": "TeachMeFisting",
  "tsma": "TeenSexMania",
  "tsm": "TeenSexMovs",
  "ttw": "TeensInTheWoods",
  "tgw": "ThaiGirlsWild",
  "taob": "TheArtOfBlowJob",
  "trwo": "TheRealWorkout",
  "tto": "TheTrainingOfO",
  "tg": "TopGrl",
  "tt": "TryTeens",
  "th": "TwistysHard",
  "vp": "VIPissy",
  "wrh": "WeAreHairy",
  "wpa": "WhippedAss",
  "yt": "YoungThroats",
  "zb": "ZoliBoy",
};

/**
 * 对应 Python 中的 ManualConfig.SUREN_DIC。
 * 这是一个从特定键到值的映射。
 */
const SUREN_DIC: Record<string, string> = {
  "SHN-": "116",  //116SHN-045
  "GANA": "200",  //200GANA-2556
  "CUTE-": "229",  //229SCUTE-953
  "LUXU": "259",  //200LUXU-2556
  "ARA-": "261",  //261ARA-094
  "DCV-": "277",  //277DCV-102
  "EWDX": "299",  //299EWDX-400
  "MAAN": "300",  //300MAAN-673
  "MIUM": "300",  //300MIUM-745
  "NTK-": "300",  //300NTK-635
  "KIRAY-": "314",  //314KIRAY-128
  "KJO-": "326",  //326KJO-002
  "NAMA-": "332",  //332NAMA-077
  "KNB-": "336",  //336KNB-172
  "SIMM-": "345",  //345SIMM-662
  "NTR-": "348",  //348NTR-001
  "JAC-": "390",  //390JAC-034
  "KIWVR": "408",  //408KIWVR-254
  "INST": "413",  //413INST-202
  "SRYA": "417",  //417SRYA-015
  "SUKE-": "428",  //428SUKE-086
  "MFC-": "435",  //435MFC-142
  "HHH-": "451",  //451HHH-027
  "TEN-": "459",  //459TEN-024
  "MLA-": "476",  //476MLA-043
  "SGK-": "483",  //483SGK-054
  "GCB-": "485",  //485GCB-015
  "SEI-": "502",  //502SEI-001
  "STCV": "529",  //529STCV-009
  "MY-": "292",  //292MY-425
  "DANDY": "104",  //104DANDY-852A
  "ICHK": "368",  //368ICHK-018
};

/**
 * @param shortName - 输入的短名称。
 * @returns 处理后的长名称或原始短名称。
 */
function longName(shortName: string): string {
  const name = OUMEI_NAME[shortName.toLowerCase()];
  return name
    ? name.toLowerCase().replaceAll("-", "").replaceAll(".", "")
    : shortName.toLowerCase();
}

function removeEscapeString1(filename: string, escapeStringList: string[], replaceChar: string = ""): string {
  let processedFilename = filename.toUpperCase();

  for (const str of escapeStringList) {
    if (str) {
      processedFilename = processedFilename.replaceAll(str.toUpperCase(), replaceChar);
    }
  }

  const shortStrings = [
    "4K", "4KS", "8K", "HD", "LR", "VR", "DVD", "FULL", "HEVC",
    "H264", "H265", "X264", "X265", "AAC", "XXX", "PRT",
  ];

  for (const each of shortStrings) {
    const regex = new RegExp(`[-_ .\\[]${each.toUpperCase()}[-_ .\\]]`, 'g');
    processedFilename = processedFilename.replace(regex, "-");
  }

  return processedFilename.replaceAll("--", "-").replace(/^[-_. ]+|[-_. ]+$/g, "");
}



// ===================================================================
// 主要转换函数 (现在已完整)
// ===================================================================

export function getFileNumber(filepath: string, escapeStringList: string[]): string {
  const originalFilenameWithoutExt = path.basename(filepath, path.extname(filepath));
  const realName = originalFilenameWithoutExt.trim() + ".";

  const fileName = removeEscapeString1(realName, escapeStringList) + ".";

  let filename = fileName
    .replaceAll("-C.", ".")
    .replaceAll(".PART", "-CD")
    .replaceAll(" EP.", ".EP")
    .replaceAll("-CD-", "");

  filename = filename.replace(/[-_ .]CD\d{1,2}/g, "");
  filename = filename.replace(/[-_ .][A-Z0-9]\.$/g, "");

  filename = filename.replaceAll(" ", "-").replace(/^[-_. ]+|[-_. ]+$/g, "");
  const oumeiFilename = filename;

  filename = filename.replace(/\d{4}[-_.]\d{1,2}[-_.]\d{1,2}/g, "");
  filename = filename.replace(/[-\[]\d{2}[-_.]\d{2}[-_.]\d{2}]?/g, "");

  filename = filename
    .replaceAll("FC2-PPV", "FC2-")
    .replaceAll("FC2PPV", "FC2-")
    .replaceAll("--", "-")
    .replaceAll("GACHIPPV", "GACHI");

  let fileNumber: string | null = null;
  let match: RegExpMatchArray | null;
  
  // --- 逻辑修复: 检查 MyWife 应该在原始清理后的文件名上进行 ---
  if (fileName.includes("MYWIFE") && /NO\.\d*/.test(fileName)) {
    match = fileName.match(/NO\.(\d*)/);
    if (match && match[1]) {
      return `Mywife No.${match[1]}`;
    }
  }
  
  if (match = filename.match(/CW3D2D?BD-?\d{2,}/)) return match[0];
  if (match = filename.match(/MMR-?[A-Z]{2,}-?\d+[A-Z]*/)) return match[0].replaceAll("MMR-", "MMR");

  if ((match = fileName.match(/([^A-Z]|^)(MD[A-Z-]*\d{4,}(-\d)?)/)) && !fileName.includes("MDVR")) {
    return match[2];
  }

  // --- 逻辑修复: 更新 Oumei 正则以支持4位年份 ---
  const oumeiMatches = [...oumeiFilename.matchAll(/([A-Z0-9-]+)[-._](20\d{2}|\d{2})[-._](\d{2})[-._](\d{2})/g)];
  if (oumeiMatches.length > 0) {
    const result = oumeiMatches[0];
    const namePart = longName(result[1].replace(/^-+|-+$/g, ""));
    const year = result[2].length === 4 ? result[2] : `20${result[2]}`;
    const datePart = `${year}.${result[3]}.${result[4]}`;
    const capitalized = namePart + "." + datePart;
    return capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
  }

  if (
    (match = filename.match(/XXX-AV-\d{4,}/)) ||
    (match = filename.match(/MKY-[A-Z]+-\d{3,}/))
  ) {
    fileNumber = match[0];
  } else if (filename.includes("FC2")) {
    filename = filename.replaceAll("PPV", "").replaceAll("_", "-").replaceAll("--", "-");
    if (match = filename.match(/FC2-\d{5,}/)) fileNumber = match[0];
    else if (match = filename.match(/FC2\d{5,}/)) fileNumber = match[0].replace("FC2", "FC2-");
    else fileNumber = filename;
  } else if (filename.includes("HEYZO")) {
    filename = filename.replaceAll("_", "-").replaceAll("--", "-");
    if (match = filename.match(/HEYZO-\d{3,}/)) fileNumber = match[0];
    else if (match = filename.match(/HEYZO\d{3,}/)) fileNumber = match[0].replace("HEYZO", "HEYZO-");
    else fileNumber = filename;
  } else if (match = filename.match(/(H4610|C0930|H0930)-[A-Z]+\d{4,}/)) {
    fileNumber = match[0];
  } else if (match = filename.match(/KIN8(TENGOKU)?-?\d{3,}/)) {
    fileNumber = match[0].replaceAll("TENGOKU", "-").replaceAll("--", "-");
  } else if (
    (match = filename.match(/S2M[BD]*-\d{3,}/)) ||
    (match = filename.match(/MCB3D[BD]*-\d{2,}/))
  ) {
    fileNumber = match[0];
  } else if (match = filename.match(/T28-?\d{3,}/)) {
    fileNumber = match[0].replaceAll("T2800", "T28-");
  } else if (match = filename.match(/TH101-\d{3,}-\d{5,}/)) {
    fileNumber = match[0].toLowerCase();
  } else if (match = filename.match(/([A-Z]{2,})00(\d{3})/)) {
    fileNumber = `${match[1]}-${match[2]}`;
  } 
  // --- 逻辑修复: 合并两个分支并应用 SUREN_DIC 逻辑 ---
  else if (
    (match = filename.match(/\d{2,}[A-Z]{2,}-\d{2,}[A-Z]?/)) ||
    (match = filename.match(/[A-Z]{2,}-\d{2,}[Z]?/))
  ) {
    fileNumber = match[0];
    for (const [key, value] of Object.entries(SUREN_DIC)) {
      if (fileNumber.includes(key)) {
        fileNumber = value + fileNumber;
        break;
      }
    }
  } 
  else if (
    (match = filename.match(/[A-Z]+-[A-Z]\d+/)) ||
    (match = filename.match(/\d{2,}[-_]\d{2,}/)) ||
    (match = filename.match(/\d{3,}-[A-Z]{3,}/))
  ) {
    fileNumber = match[0];
  } else if (match = filename.match(/([^A-Z]|^)(N\d{4})(\D|$)/)) {
    fileNumber = match[2].toLowerCase();
  } else if (match = filename.match(/H_\d{3,}([A-Z]{2,})(\d{2,})/)) {
    fileNumber = `${match[1]}-${match[2]}`;
  } else {
    // --- 逻辑修复: Fallback 逻辑更精确，并使用原始文件名 ---
    const finalMatch = filename.match(/([A-Z]{3,}-\d{2,})|([A-Z]{2,}-\d{3,})/);
    if (finalMatch) {
      fileNumber = finalMatch[0];
    } else {
      let tempName = removeEscapeString1(originalFilenameWithoutExt, escapeStringList);
      tempName = tempName.replace(/[【(（\[].+?[\]）)】]/g, "").trim();
      fileNumber = tempName.normalize("NFC");
      console.warn("Warning: Japanese character encoding conversion is not supported and has been skipped.");
    }
  }

  if (fileNumber.startsWith("FC-")) {
    fileNumber = fileNumber.replace("FC-", "FC2-");
  }

  return fileNumber.replace(/^[-_. ]+|[-_. ]+$/g, "");
}
export const tagsEnum = [
  'title', 'originaltitle', 'actor', 'all_actor', 'first_actor', 'number', 'letters', 'first_letter',
  'director', 'series', 'studio', 'publisher', 'release', 'year', 'runtime', '4k'
];

export const variableRegex = new RegExp(`(${tagsEnum.join('|')})`, 'g');

export const generatePathFromRule = (rule: string, data: any): string => {
  // 边缘情况处理：如果规则或数据为空，则返回空字符串。
  if (!rule || !data) {
    return '';
  }

  // 使用 replace 方法和回调函数来处理每一个匹配到的变量
  return rule.replace(variableRegex, (matchedWord) => {
    // 从 data 对象中获取对应的值
    const value = data[matchedWord];
    return value != null ? String(value) : '';
  });
};