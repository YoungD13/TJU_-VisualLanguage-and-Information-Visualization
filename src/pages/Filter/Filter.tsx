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
        <div className="filter-container">
            <div className="filter-item">
                <label>标题关键词:</label>
                <Input
                    placeholder="请输入标题关键词"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>
            <div className="filter-item">
                <label>作者:</label>
                <Input
                    placeholder="请输入作者名称"
                    value={author || ''}
                    onChange={(e) => setAuthor(e.target.value)}
                />
            </div>
            <div className="filter-item">
                <label>起始年份:</label>
                <Input
                    type="number"
                    placeholder="例如: 2010"
                    value={startYear || ''}
                    onChange={(e) =>
                        setStartYear(Number(e.target.value) || null)
                    }
                />
            </div>
            <div className="filter-item">
                <label>截止年份:</label>
                <Input
                    type="number"
                    placeholder="例如: 2023"
                    value={endYear || ''}
                    onChange={(e) => setEndYear(Number(e.target.value) || null)}
                />
            </div>
            <div className="filter-item">
                <label>会议:</label>
                <Select
                    placeholder="选择会议"
                    value={conference || undefined}
                    onChange={(value) => setConference(value)}
                    style={{ width: '100%' }}
                    allowClear
                >
                    {conferences.map((conf) => (
                        <Option key={conf} value={conf}>
                            {conf}
                        </Option>
                    ))}
                </Select>
            </div>
            <div className="filter-item">
                <label>奖项:</label>
                <Select
                    placeholder="选择奖项"
                    value={award || undefined}
                    onChange={(value) => setAward(value)}
                    style={{ width: '100%' }}
                    allowClear
                >
                    {awards.map((awd) => (
                        <Option key={awd as string} value={awd as string}>
                            {awd}
                        </Option>
                    ))}
                </Select>
            </div>
            <div className="filter-buttons">
                <Button type="primary" onClick={handleFilterChange}>
                    筛选
                </Button>
                <Button onClick={handleReset} style={{ marginLeft: '8px' }}>
                    重置
                </Button>
            </div>
        </div>
    );
};

export default Filter;
