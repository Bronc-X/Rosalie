import type {
  CoordinateSystem,
  ExperienceState,
  LatLngTuple,
  LocationStatus,
  RecommendationStatus,
} from '../lib/domain/types.ts';

/** @deprecated Use locationStatus and recommendationStatus separately. */
export type RestaurantStatus = 'verified' | 'pending' | 'avoid';

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  address: string;
  coordinates?: LatLngTuple;
  coordinateSystem: CoordinateSystem;
  locationStatus: LocationStatus;
  locationNote?: string;
  recommendationStatus: RecommendationStatus;
  state: ExperienceState;
  /** @deprecated Compatibility alias for the original FoodAtlas UI. */
  status: RestaurantStatus;
  tip?: string;
  image?: string;
  featuredDish?: string;
};

type RestaurantSeed = Omit<
  Restaurant,
  'id' | 'coordinateSystem' | 'locationStatus' | 'locationNote' | 'recommendationStatus' | 'state'
>;

const item = (
  name: string,
  category: string,
  address: string,
  coordinates?: LatLngTuple,
  tip?: string,
  status: RestaurantStatus = coordinates ? 'verified' : 'pending',
  image?: string,
  featuredDish?: string,
): RestaurantSeed => ({ name, category, address, coordinates, tip, status, image, featuredDish });

const entries: RestaurantSeed[] = [
  item('纪德来甜汤', '甜品小食', '地址待现场确认', undefined, '十年陈老药桔牛奶冰，酸甜口；老杉排芝麻茶牛奶冰强推', 'pending', '/food/jidelai.jpg', '老杉排芝麻茶牛奶冰'),
  item('金二顺潮汕生腌', '生腌', '金平区玫瑰一街102号', [23.371834, 116.710949], '血蚶、车白脆中带韧；生食请按身体情况选择', 'verified', '/food/jinershun.jpg', '潮汕生腌'),
  item('三姐妹肠粉', '肠粉', '金平区永平路28号', [23.352958, 116.671607], '酱油汁薄皮有韧劲，萝卜干爽口', 'verified', '/food/sisters.jpg', '牛肉肠粉'),
  item('老牌福记加浓豆浆', '甜品小食', '金平区龙眼南路51号菊园6栋102', [23.36264, 116.71098], '姜薯鸡蛋豆浆；夜间营业信息出发前再确认', 'verified', '/food/fuji.jpg', '姜薯鸡蛋豆浆'),

  item('贵宾牛', '牛肉火锅', '龙湖区珠池路61号君汇家园1幢103号', [23.37231, 116.746149], '潮汕牛肉火锅汕头旗舰店'),
  item('杏花吴记', '牛肉火锅', '金平区杏花西路16号', [23.36596, 116.68469], '杏花西路店'),

  item('金华肠粉', '肠粉', '金平区汕樟路36号', [23.364869, 116.693455], '汕樟店'),
  item('梅园肠粉', '肠粉', '金平区金环路30号', [23.364446, 116.715713], '金环店'),
  item('小吴肠粉', '肠粉', '金平区龙眼南路龙眼市场椰园4幢', [23.36275, 116.71048], '网红店，建议避开高峰'),
  item('俊康肠粉', '肠粉', '金平区中山路3号', [23.35839, 116.678094], '金凤坛店'),

  item('白埕灼肉', '粿条面', '金平区金埕路4号新白埕农副产品批零点195号', [23.375798, 116.694295], '登记名：白埕促肉；原单写作“白呈火足肉”；凌晨1:50准时来肉，要去市场里面那家'),
  item('佳武干面', '粿条面', '龙湖区衡山路11号之2', [23.362606, 116.732261], '柠檬促肉店'),
  item('老胡牛肉粿', '粿条面', '金平区杏园街14号', [23.369511, 116.712391]),
  item('行无路炒粿条', '粿条面', '金平区长平路48号', [23.361921, 116.706265], '地图登记名：行无路牛肉炒粿'),
  item('食未牛肉饺', '粿条面', '龙湖区榕江路富贵华苑19号', [23.36872, 116.72074], '榕江店'),
  item('公园路牛肉丸', '粿条面', '金平区小公园街道公园路5号101（近人民广场）', [23.354573, 116.683161]),
  item('李记粿汁', '粿条面', '金平区龙眼北路93号1号', [23.3683, 116.71076], '龙眼总店'),
  item('英华粿条', '粿条面', '金平区玫瑰一街杏园街21号', [23.370022, 116.712769], '早至中午；肾只必点'),
  item('正记饮食店', '粿条面', '具体门牌待确认', undefined, '地图仅检到相近的“正记小食店”，暂不混同'),

  item('富苑', '白粥大排档', '龙湖区朝阳庄北区12栋102', [23.365381, 116.728841], '地图登记名：富苑饮食'),
  item('长平老姿娘白粥', '白粥大排档', '金平区长平路38号', [23.361845, 116.70359], '地图登记名：长平老姿娘夜粥'),
  item('金园白粥', '白粥大排档', '金平区金园路7号底层06号房之二', [23.370385, 116.702616]),
  item('不夜粥', '白粥大排档', '龙湖区长平路192号', [23.361979, 116.756854], '地图登记名：不夜粥海鲜店'),

  item('石头宴', '小炒', '金平区金园路百合园2座3栋3号', [23.370509, 116.710069]),
  item('腯腯鱼仔摊', '小炒', '金平区金砂路28号', [23.365991, 116.695272]),
  item('福乐', '小炒', '具体门牌待确认', undefined, '检到国际商业大厦的同名候选，但原单线索不足，暂不强行归属'),
  item('咸面线', '小炒', '具体门牌待确认', undefined, '原单名称待补充完整店名'),

  item('东兴甜汤', '甜品小食', '金平区东兴二横巷2号108号房', [23.36986, 116.70733], '地图登记名：东兴甜汤鲎粿'),
  item('金兴糖葱薄饼', '甜品小食', '金平区民族路金兴苑16栋', [23.359825, 116.677276]),
  item('老王炒糕粿', '甜品小食', '金平区民族路2号', [23.355355, 116.675365], '地图登记名：老王牌炒糕粿'),
  item('猪肠胀糯米', '甜品小食', '金平区百花路月季园25幢105号', [23.37727, 116.70811], '按常见写法由“猪肠涨糯米”校正'),
  item('冰心甜汤', '甜品小食', '金平区玫瑰园46栋103', [23.37182, 116.71271], '地图登记名：冰心甜品总店'),
  item('龙眼夜豆浆', '甜品小食', '龙眼片区具体门牌待确认', undefined, '名称可能是片区备注，需补充店招'),
  item('洪记炒糕粿', '甜品小食', '汕头四中旁，具体门牌待确认', undefined, '按原单：四中旁边'),

  item('煮海', '私房菜', '金平区海滨路53号海逸汇景酒店', [23.352785, 116.713816], '潮菜研究会煮海餐厅'),
  item('建业酒家', '私房菜', '龙湖区凤凰山路10号首层', [23.376139, 116.71395]),
  item('鼎仔翅', '私房菜', '龙湖区凤凰山路龙湖公寓8栋', [23.374267, 116.714287]),
  item('庄氏祥记', '私房菜', '龙湖区中山东路166号国瑞建材家居博览中心2号楼4楼', [23.352949, 116.739706]),
  item('杜龙火锅', '私房菜', '金平区中山路2号01', [23.358366, 116.683223], '公园头饮食店'),
  item('会姐开的馆子', '私房菜', '龙湖区星光华庭6栋116铺', [23.3669, 116.71894], '星光店'),

  item('苏烤', '异国料理', '龙湖区黄山路61号', [23.373166, 116.747332]),
  item('泰越精厨', '异国料理', '龙湖区嵩山南路中泰花园53幢C05', [23.356219, 116.737873], '中泰店'),
  item('酱心籽意', '异国料理', '金平区金砂东路99号君悦华庭1栋一层105', [23.36684, 116.715321]),
  item('西源食客', '异国料理', '金平区滨港路16号泰安华庭东区22号124铺', [23.35506, 116.71245], '泰安店'),

  item('金海湾', '早茶', '龙湖区金砂东路96号金海湾大酒店', [23.365507, 116.718175], '早茶目的地'),
  item('月眉湾', '早茶', '金平区金湖路95号', [23.374962, 116.699812], '原单明确标注“别去”', 'avoid'),

  item('裕记', '烧腊简餐', '龙湖区嵩山路南汇大厦首层', [23.36452, 116.73831], '裕记烧腊连锁嵩山店'),
  item('苏南勤记', '烧腊简餐', '金平区龙眼园南区', [23.363873, 116.710519], '鹅肉饭'),
  item('功夫卤鹅', '烧腊简餐', '金平区龙眼路67号', [23.36452, 116.71074], '地图登记名：陶家功夫卤鹅龙眼店'),

  item('适口餐厅砂锅粥', '截图补充', '金平区公信路29号之一（公信路总店）', [23.361122, 116.713093], '地址来自补充截图；点位按公信路29号定位'),
  item('桂园地都蟹粥', '截图补充', '金平区长平路68号3号', [23.361685, 116.710909], '桂园南苑店'),
  item('潮壹鱼肠米粉', '截图补充', '金平区杏花路7号之二', [23.366721, 116.683253]),
  item('兴财餐室', '截图补充', '濠江区达濠街道计委楼下铺间', [23.28271, 116.721477], '补充截图中的店招'),
];

const pendingLocationNotes: Readonly<Record<string, string>> = {
  '纪德来甜汤': '存在金墩店和尚好旗舰店两个同名分店，原单无法确认具体分店。',
  '正记饮食店': '仅找到名称不同的“正记小食店”候选，不能可靠判定为同一家。',
  '福乐': '名称过于宽泛，且候选商户主营类别与原单冲突。',
  '咸面线': '原条目仅为菜名，无法唯一绑定具体商户。',
  '龙眼夜豆浆': '原条目属于片区描述，存在多个合理候选，无法确认具体门店。',
  '洪记炒糕粿': '仅有“汕头四中旁”线索，未找到可核验的精确同名结果。',
};

export const restaurants: Restaurant[] = entries.map((entry, index) => {
  const locationStatus: LocationStatus = entry.coordinates ? 'verified' : 'pending';
  const recommendationStatus: RecommendationStatus = entry.status === 'avoid' ? 'avoid' : 'normal';

  return {
    ...entry,
    id: `food-${String(index + 1).padStart(2, '0')}`,
    coordinateSystem: 'gcj02',
    locationStatus,
    locationNote: pendingLocationNotes[entry.name],
    recommendationStatus,
    state: 'wishlist',
  };
});

export const categories = ['全部', ...Array.from(new Set(restaurants.map((restaurant) => restaurant.category)))];
