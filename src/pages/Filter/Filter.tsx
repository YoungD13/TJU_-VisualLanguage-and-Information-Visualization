import React, { useState, useMemo } from 'react';
import { Input, Button, Select } from 'antd';
// 假设您的 vispubs.json 位于正确路径
import vispubsData from '../../../public/data/vispubs.json';
import './Filter.less';

const { Option } = Select;

interface FilterProps {
    onFilterChange: (filters: any) => void;
    onFilterReset: () => void;
}

const Filter: React.FC<FilterProps> = ({ onFilterChange, onFilterReset }) => {
    const [title, setTitle] = useState<string | null>(null);
    const [author, setAuthor] = useState<string | null>(null);
    const [startYear, setStartYear] = useState<number | null>(null);
    const [endYear, setEndYear] = useState<number | null>(null);
    const [conference, setConference] = useState<string | null>(null);
    const [award, setAward] = useState<string | null>(null);

    // 核心修复：过滤掉 null, undefined, 或空字符串的选项
    const { conferences, awards } = useMemo(() => {
        const confs = [
            ...new Set(
                Array.isArray(vispubsData)
                    ? vispubsData.map((item) => item.Conference)
                    : [],
            ),
        ].filter((c) => c && c !== '');
        const awds = [
            ...new Set(
                Array.isArray(vispubsData)
                    ? vispubsData.map((item) => item.Award)
                    : [],
            ),
        ].filter((a) => a && a !== '');
        return { conferences: confs, awards: awds };
    }, []);

    const handleFilterChange = () => {
        onFilterChange({
            title,
            author,
            startYear,
            endYear,
            conference,
            award,
        });
    };

    const handleReset = () => {
        setTitle(null);
        setAuthor(null);
        setStartYear(null);
        setEndYear(null);
        setConference(null);
        setAward(null);
        onFilterReset();
    };

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
            }}
        >
            <Input
                placeholder="标题关键词"
                value={title || ''}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: 180 }}
                allowClear
            />
            <Input
                placeholder="作者姓名"
                value={author || ''}
                onChange={(e) => setAuthor(e.target.value)}
                style={{ width: 150 }}
                allowClear
            />
            <Select
                placeholder="会议"
                value={conference || undefined}
                onChange={(value) => setConference(value)}
                style={{ width: 140 }}
                allowClear
            >
                {conferences.map((conf) => (
                    <Option key={conf} value={conf}>
                        {conf}
                    </Option>
                ))}
            </Select>
            <Select
                placeholder="奖项"
                value={award || undefined}
                onChange={(value) => setAward(value)}
                style={{ width: 140 }}
                allowClear
            >
                {awards.map((awd) => (
                    <Option key={awd as string} value={awd as string}>
                        {awd}
                    </Option>
                ))}
            </Select>
            <Input
                type="number"
                placeholder="起始年份"
                value={startYear || ''}
                onChange={(e) => setStartYear(Number(e.target.value) || null)}
                style={{ width: 110 }}
            />
            <Input
                type="number"
                placeholder="截止年份"
                value={endYear || ''}
                onChange={(e) => setEndYear(Number(e.target.value) || null)}
                style={{ width: 110 }}
            />
            <Button type="primary" onClick={handleFilterChange}>
                应用筛选
            </Button>
            <Button onClick={handleReset}>重置</Button>
        </div>
    );
};

export default Filter;
