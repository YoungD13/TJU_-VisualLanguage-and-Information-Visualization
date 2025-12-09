import { useState } from 'react';
import vispubsData from '../../public/data/vispubs.json';

export default () => {
    // 获取所有年份并排序
    const years = [...new Set(vispubsData.map((item) => item.Year))].sort(
        (a, b) => a - b,
    ); // 按年份升序排序

    // 初始化数据状态
    const [s1Data, setS1Data] = useState({
        nodes: vispubsData.filter((item) => {
            const year = parseInt(item.Year);
            return year >= 1990 && year <= 2026;
        }),
        links: [],
    });

    return {
        s1Data,
        setS1Data,
        years,
    };
};
