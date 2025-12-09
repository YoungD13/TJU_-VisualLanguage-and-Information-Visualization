// index.tsx
import { Layout } from 'antd';
import React, { useState, useCallback, useMemo } from 'react';
// 确保路径和大小写正确
import Timeline from './TimeLine/Timeline';
import Filter from './Filter/Filter';
import Statistics from './Statistics/Statistics';
import Network from './Network/Network';
import Literature from './Literature/Literature';
import './index.less';

// 假设 vispubs.json 是所有文献数据的来源
import vispubsData from '../../public/data/vispubs.json';

const { Content } = Layout;

// 1. 数据预处理：清理和规范化所有数据
const allPapers = vispubsData.map((d: any) => ({
    ...d,
    Year: parseInt(d.Year) || 0,
    AuthorNames: Array.isArray(d['AuthorNames-Dedpuped'])
        ? d['AuthorNames-Dedpuped']
        : d['AuthorNames-Dedpuped']
        ? [d['AuthorNames-Dedpuped']]
        : [],
    date: new Date(parseInt(d.Year) || 0, 0, 1),
}));

const Index: React.FC = () => {
    // A. 全局筛选状态 (来自 Filter.tsx)
    const [globalFilters, setGlobalFilters] = useState({});

    // B. 交互筛选结果状态 (来自图表点击/框选，优先级从低到高)
    const [timelineSelectionPapers, setTimelineSelectionPapers] =
        useState<any[]>(allPapers); // 默认显示所有论文
    const [statisticsSelectionPapers, setStatisticsSelectionPapers] = useState<
        any[]
    >([]);
    const [networkSelectionPapers, setNetworkSelectionPapers] = useState<any[]>(
        [],
    );

    // C. 选中和高亮状态 (用于详情和跨视图高亮)
    const [selectedLiteratureItem, setSelectedLiteratureItem] = useState<
        any | null
    >(null);
    const [highlightedPapers, setHighlightedPapers] = useState<any[]>([]); // 需要在所有视图中高亮的论文列表

    // --- 全局筛选与重置逻辑 ---
    const handleFilterChange = (newFilters: any) => {
        setGlobalFilters(newFilters);
        // 清除所有交互筛选结果
        setStatisticsSelectionPapers([]);
        setNetworkSelectionPapers([]);
        setHighlightedPapers([]);
        setSelectedLiteratureItem(null);
    };

    const handleFilterReset = () => {
        setGlobalFilters({});
        setStatisticsSelectionPapers([]);
        setNetworkSelectionPapers([]);
        setHighlightedPapers([]);
        setSelectedLiteratureItem(null);
    };

    // --- 核心优先级逻辑 ---
    const finalLiteratureList = useMemo(() => {
        if (networkSelectionPapers.length > 0) {
            return networkSelectionPapers; // Network 优先级最高
        }
        if (statisticsSelectionPapers.length > 0) {
            return statisticsSelectionPapers; // Statistics 优先级次高
        }
        // 如果没有交互筛选，则显示 Timeline/Global Filter 的结果
        return timelineSelectionPapers;
    }, [
        timelineSelectionPapers,
        networkSelectionPapers,
        statisticsSelectionPapers,
    ]);

    // --- 联动回调函数 ---

    // 回调 1: 接收 Timeline 的时间筛选结果 (优先级最低的基础列表)
    const handleTimelineFilter = useCallback((nodes: any[]) => {
        setTimelineSelectionPapers(nodes);
        // 清除 Network/Statistics 的优先筛选，但保留 Highlight
        setStatisticsSelectionPapers([]);
        setNetworkSelectionPapers([]);
    }, []);

    // 回调 2: 接收 Network 的筛选结果 (高优先级)
    const handleNetworkFilter = useCallback((papers: any[]) => {
        setNetworkSelectionPapers(papers);
        setStatisticsSelectionPapers([]); // 清除 Statistics 优先筛选
        setHighlightedPapers(papers); // 框选结果同时高亮
        setSelectedLiteratureItem(papers.length > 0 ? papers[0] : null);
    }, []);

    // 回调 3: 接收 Statistics 的筛选结果 (中优先级)
    const handleStatisticsFilter = useCallback((papers: any[]) => {
        setStatisticsSelectionPapers(papers);
        setNetworkSelectionPapers([]); // 清除 Network 优先筛选
        setHighlightedPapers(papers); // 结果同时高亮
    }, []);

    // 回调 4: 接收点击事件，用于设置高亮和详情
    const handleLiteratureClick = useCallback(
        (papers: any[], selectedItem: any | null) => {
            setHighlightedPapers(papers);
            setSelectedLiteratureItem(selectedItem);
            // 清除所有筛选，以便高亮在全局数据上生效 (例如：点击单篇论文)
            setNetworkSelectionPapers([]);
            setStatisticsSelectionPapers([]);
        },
        [],
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 侧边栏 - Filter */}
            <div className="filter-sider" style={{ width: 300 }}>
                <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>
                    筛选条件
                </h3>
                <Filter
                    onFilterChange={handleFilterChange}
                    onFilterReset={handleFilterReset}
                    allPapers={allPapers}
                />
            </div>

            {/* 主内容区 - Dashboard Grid */}
            <div className="dashboard-content">
                <div className="dashboard-grid">
                    {/* 1. 时间轴 (左上方，跨两列) */}
                    <div
                        className="dashboard-card"
                        style={{ gridColumn: '1 / span 2' }}
                    >
                        <h3>时间分布 (点击/拖拽筛选)</h3>
                        <div className="chart-container">
                            <Timeline
                                globalFilters={globalFilters} // 原始全局筛选条件
                                allPapers={allPapers} // 所有论文数据
                                onLiteratureFilter={handleTimelineFilter} // 输出时间范围筛选结果 (优先级最低)
                                highlightedPapers={highlightedPapers} // 输入高亮数据
                                onLiteratureClick={handleLiteratureClick} // 输出点击的论文详情和高亮
                                reset={false} // 重置标志
                            />
                        </div>
                    </div>

                    {/* 2. 文献详情列表 (右侧，跨两行) */}
                    <div
                        className="dashboard-card"
                        style={{ gridColumn: '3 / 4', gridRow: '1 / span 2' }}
                    >
                        <h3>文献列表与详情</h3>
                        <div className="chart-container" style={{ padding: 0 }}>
                            <Literature
                                filteredNodes={finalLiteratureList}
                                selectedNode={selectedLiteratureItem}
                                setSelectedNode={setSelectedLiteratureItem}
                            />
                        </div>
                    </div>

                    {/* 3. 作者网络 (左下方) */}
                    <div className="dashboard-card">
                        <h3>合作网络 (点击/框选筛选)</h3>
                        <div className="chart-container">
                            <Network
                                allPapers={timelineSelectionPapers} // 传入当前基础筛选列表 (Timeline/Global Filter结果)
                                onLiteratureFilter={handleNetworkFilter} // 输出网络筛选结果 (高优先级)
                                highlightedPapers={highlightedPapers} // 输入高亮数据
                                onLiteratureClick={handleLiteratureClick} // 输出点击的论文详情和高亮
                            />
                        </div>
                    </div>

                    {/* 4. 统计分析 (中间下方) */}
                    <div className="dashboard-card">
                        <h3>统计分析</h3>
                        <div className="chart-container">
                            <Statistics
                                allPapers={finalLiteratureList} // 传入当前列表（高优先级筛选后的结果）
                                onLiteratureFilter={handleStatisticsFilter} // 输出统计筛选结果 (中优先级)
                                highlightedPapers={highlightedPapers} // 输入高亮数据
                                onLiteratureClick={handleLiteratureClick} // 输出点击的论文详情和高亮
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Index;
