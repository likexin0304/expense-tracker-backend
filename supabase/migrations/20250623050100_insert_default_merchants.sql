-- 插入预置商户数据

-- 餐饮类商户
insert into merchants (name, category, keywords, confidence_score) values
('麦当劳', '餐饮', array['麦当劳', 'McDonald', 'M记', '金拱门'], 1.0),
('肯德基', '餐饮', array['肯德基', 'KFC', 'K记'], 1.0),
('星巴克', '餐饮', array['星巴克', 'Starbucks', '星爸爸'], 1.0),
('海底捞', '餐饮', array['海底捞', '海底捞火锅'], 1.0),
('喜茶', '餐饮', array['喜茶', 'HEYTEA'], 1.0),
('瑞幸咖啡', '餐饮', array['瑞幸', '瑞幸咖啡', 'Luckin'], 1.0),
('蜜雪冰城', '餐饮', array['蜜雪冰城', '蜜雪'], 1.0),
('必胜客', '餐饮', array['必胜客', 'Pizza Hut'], 1.0),
('汉堡王', '餐饮', array['汉堡王', 'Burger King'], 1.0),
('德克士', '餐饮', array['德克士', 'Dicos'], 1.0),
('真功夫', '餐饮', array['真功夫'], 1.0),
('沙县小吃', '餐饮', array['沙县', '沙县小吃'], 1.0),
('兰州拉面', '餐饮', array['兰州拉面', '兰州牛肉面'], 1.0),
('黄焖鸡米饭', '餐饮', array['黄焖鸡', '黄焖鸡米饭'], 1.0),
('华莱士', '餐饮', array['华莱士', '华来士'], 1.0),
('永和大王', '餐饮', array['永和大王', '永和豆浆'], 1.0),
('全家便利店', '餐饮', array['全家', 'FamilyMart'], 1.0),
('7-11', '餐饮', array['7-11', '7-Eleven', '711'], 1.0),
('便利蜂', '餐饮', array['便利蜂'], 1.0),
('罗森', '餐饮', array['罗森', 'Lawson'], 1.0);

-- 购物类商户
insert into merchants (name, category, keywords, confidence_score) values
('淘宝', '购物', array['淘宝', 'Taobao', '天猫'], 1.0),
('京东', '购物', array['京东', 'JD', '京东商城'], 1.0),
('拼多多', '购物', array['拼多多', 'PDD'], 1.0),
('苏宁易购', '购物', array['苏宁', '苏宁易购'], 1.0),
('唯品会', '购物', array['唯品会', 'VIP'], 1.0),
('小米商城', '购物', array['小米', '小米商城'], 1.0),
('华为商城', '购物', array['华为', '华为商城'], 1.0),
('Apple Store', '购物', array['Apple', '苹果', 'App Store'], 1.0),
('沃尔玛', '购物', array['沃尔玛', 'Walmart'], 1.0),
('家乐福', '购物', array['家乐福', 'Carrefour'], 1.0),
('大润发', '购物', array['大润发'], 1.0),
('永辉超市', '购物', array['永辉', '永辉超市'], 1.0),
('华润万家', '购物', array['华润万家', '华润'], 1.0),
('物美', '购物', array['物美', '物美超市'], 1.0),
('盒马鲜生', '购物', array['盒马', '盒马鲜生'], 1.0),
('叮咚买菜', '购物', array['叮咚买菜', '叮咚'], 1.0),
('每日优鲜', '购物', array['每日优鲜'], 1.0),
('美团买菜', '购物', array['美团买菜'], 1.0);

-- 交通类商户
insert into merchants (name, category, keywords, confidence_score) values
('滴滴出行', '交通', array['滴滴', '滴滴出行', 'Didi'], 1.0),
('Uber', '交通', array['Uber', '优步'], 1.0),
('曹操出行', '交通', array['曹操出行', '曹操'], 1.0),
('神州专车', '交通', array['神州专车', '神州'], 1.0),
('首汽约车', '交通', array['首汽约车', '首汽'], 1.0),
('嘀嗒出行', '交通', array['嘀嗒', '嘀嗒出行'], 1.0),
('哈啰出行', '交通', array['哈啰', '哈啰出行', '哈罗'], 1.0),
('青桔单车', '交通', array['青桔', '青桔单车'], 1.0),
('美团单车', '交通', array['美团单车'], 1.0),
('共享单车', '交通', array['共享单车', '单车'], 0.8),
('地铁', '交通', array['地铁', '轨道交通', '城市轨道'], 1.0),
('公交', '交通', array['公交', '公交车', '巴士'], 1.0),
('出租车', '交通', array['出租车', '的士', 'Taxi'], 1.0),
('中石油', '交通', array['中石油', '中国石油'], 1.0),
('中石化', '交通', array['中石化', '中国石化'], 1.0),
('壳牌', '交通', array['壳牌', 'Shell'], 1.0),
('加油站', '交通', array['加油站', '加油'], 0.8),
('停车费', '交通', array['停车', '停车费', '车位费'], 0.9),
('高速费', '交通', array['高速', '高速费', '过路费'], 0.9),
('机场', '交通', array['机场', '航站楼'], 0.8);

-- 生活服务类商户
insert into merchants (name, category, keywords, confidence_score) values
('国家电网', '生活', array['国家电网', '电费', '供电'], 1.0),
('自来水公司', '生活', array['自来水', '水费', '供水'], 1.0),
('燃气公司', '生活', array['燃气', '天然气', '煤气费'], 1.0),
('物业费', '生活', array['物业', '物业费', '物业管理'], 1.0),
('宽带费', '生活', array['宽带', '网费', '宽带费'], 1.0),
('手机话费', '生活', array['话费', '手机费', '通信费'], 1.0),
('中国移动', '生活', array['中国移动', '移动'], 1.0),
('中国联通', '生活', array['中国联通', '联通'], 1.0),
('中国电信', '生活', array['中国电信', '电信'], 1.0),
('理发店', '生活', array['理发', '美发', '发廊'], 0.8),
('洗衣店', '生活', array['洗衣', '干洗'], 0.8),
('维修', '生活', array['维修', '修理'], 0.7),
('快递', '生活', array['快递', '邮费', '运费'], 0.8),
('顺丰速运', '生活', array['顺丰', '顺丰速运'], 1.0),
('圆通速递', '生活', array['圆通', '圆通速递'], 1.0),
('中通快递', '生活', array['中通', '中通快递'], 1.0),
('韵达快递', '生活', array['韵达', '韵达快递'], 1.0);

-- 娱乐类商户
insert into merchants (name, category, keywords, confidence_score) values
('电影院', '娱乐', array['电影院', '影院', '电影票'], 0.9),
('万达影城', '娱乐', array['万达影城', '万达'], 1.0),
('CGV影城', '娱乐', array['CGV', 'CGV影城'], 1.0),
('大地影院', '娱乐', array['大地影院', '大地'], 1.0),
('KTV', '娱乐', array['KTV', 'K歌', '卡拉OK'], 0.9),
('钱柜KTV', '娱乐', array['钱柜', '钱柜KTV'], 1.0),
('麦乐迪', '娱乐', array['麦乐迪', 'melody'], 1.0),
('网吧', '娱乐', array['网吧', '网咖'], 0.8),
('游戏厅', '娱乐', array['游戏厅', '电玩城'], 0.8),
('健身房', '娱乐', array['健身房', '健身', '健身中心'], 0.9),
('游泳馆', '娱乐', array['游泳馆', '游泳池'], 0.9),
('台球厅', '娱乐', array['台球', '台球厅'], 0.9);

-- 医疗类商户
insert into merchants (name, category, keywords, confidence_score) values
('医院', '医疗', array['医院', '医疗'], 0.8),
('药店', '医疗', array['药店', '药房'], 0.8),
('同仁堂', '医疗', array['同仁堂'], 1.0),
('屈臣氏', '医疗', array['屈臣氏', 'Watsons'], 1.0),
('康美药业', '医疗', array['康美', '康美药业'], 1.0),
('体检中心', '医疗', array['体检', '体检中心'], 0.9),
('牙科诊所', '医疗', array['牙科', '口腔', '牙医'], 0.9),
('眼科医院', '医疗', array['眼科', '眼科医院'], 0.9);

-- 教育类商户
insert into merchants (name, category, keywords, confidence_score) values
('学校', '教育', array['学校', '大学', '学院'], 0.7),
('培训机构', '教育', array['培训', '教育', '辅导'], 0.7),
('新东方', '教育', array['新东方'], 1.0),
('学而思', '教育', array['学而思'], 1.0),
('好未来', '教育', array['好未来'], 1.0),
('书店', '教育', array['书店', '图书'], 0.8),
('新华书店', '教育', array['新华书店'], 1.0),
('当当网', '教育', array['当当', '当当网'], 1.0); 