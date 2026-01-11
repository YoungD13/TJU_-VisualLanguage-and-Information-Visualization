// index.tsx
import { Layout } from 'antd';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Timeline from './TimeLine/Timeline';
import Filter from './Filter/Filter';
import Statistics from './Statistics/Statistics';
import Network from './Network/Network';
import Literature from './Literature/Literature';
import './index.less';

const { Content } = Layout;

type GlobalFilters = {
    title?: string;
    author?: string;
    yearRange?: [number, number];
    conference?: string;
    award?: string;
};

const applyGlobalFilters = (papers: any[], filters: GlobalFilters) => {
    const { title, author, yearRange, conference, award } = filters || {};
    return papers.filter((p) => {
        const matchTitle = title
            ? (p.Title || '').toLowerCase().includes(title.toLowerCase())
            : true;
        const matchAuthor = author
            ? Array.isArray(p.AuthorNames) &&
              p.AuthorNames.some((a: string) =>
                  a.toLowerCase().includes(author.toLowerCase()),
              )
            : true;
        const matchYear = yearRange
            ? p.Year >= yearRange[0] && p.Year <= yearRange[1]
            : true;
        const matchConf = conference
            ? (p.Conference || '').toLowerCase() === conference.toLowerCase()
            : true;
        const matchAward = award ? (p.Award || '') === award : true;
        return (
            matchTitle && matchAuthor && matchYear && matchConf && matchAward
        );
    });
};

const Index: React.FC = () => {
    // 数据加载状态
    const [papersLoading, setPapersLoading] = useState(true);
    const [papers, setPapers] = useState<any[]>([]);

    // A. 全局筛选状态 (来自 Filter.tsx)
    const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({});

    // B. 交互筛选结果状态 (来自图表点击/框选，优先级从低到高)
    const [timelineSelectionPapers, setTimelineSelectionPapers] = useState<
        any[]
    >([]);
    const [networkSelectionPapers, setNetworkSelectionPapers] = useState<any[]>(
        [],
    );
    const [statisticsSelectionPapers, setStatisticsSelectionPapers] = useState<
        any[]
    >([]);
    const [highlightedPapers, setHighlightedPapers] = useState<any[]>([]);
    const [selectedLiteratureItem, setSelectedLiteratureItem] = useState<
        any | null
    >(null);

    // --- 异步加载数据 ---
    useEffect(() => {
        fetch('/data/vispubs.json')
            .then((res) => res.json())
            .then((vispubsData) => {
                const rawData = Array.isArray(vispubsData) ? vispubsData : [];
                const parsed = rawData.map((d: any) => ({
                    ...d,
                    Year: parseInt(d.Year) || 0,
                    AuthorNames: Array.isArray(d['AuthorNames-Dedpuped'])
                        ? d['AuthorNames-Dedpuped']
                        : d['AuthorNames-Dedpuped']
                        ? [d['AuthorNames-Dedpuped']]
                        : [],
                    date: new Date(parseInt(d.Year) || 0, 0, 1),
                }));
                setPapers(parsed);
                setTimelineSelectionPapers(parsed);
            })
            .finally(() => setPapersLoading(false));
    }, []);

    // 经过全局筛选的数据
    const filteredByGlobal = useMemo(
        () => applyGlobalFilters(papers, globalFilters),
        [papers, globalFilters],
    );

    // 终态列表优先级：Network > Statistics > Timeline/global
    const finalLiteratureList = useMemo(() => {
        if (networkSelectionPapers.length > 0) return networkSelectionPapers;
        if (statisticsSelectionPapers.length > 0)
            return statisticsSelectionPapers;
        if (timelineSelectionPapers.length > 0) return timelineSelectionPapers;
        return filteredByGlobal;
    }, [
        networkSelectionPapers,
        statisticsSelectionPapers,
        timelineSelectionPapers,
        filteredByGlobal,
    ]);

    // --- 回调 1: Filter 提交 ---
    const handleFilterChange = useCallback(
        (filters: GlobalFilters) => {
            setGlobalFilters(filters);
            const filtered = applyGlobalFilters(papers, filters);
            setTimelineSelectionPapers(filtered);
            setNetworkSelectionPapers([]);
            setStatisticsSelectionPapers([]);
            setHighlightedPapers([]);
            setSelectedLiteratureItem(null);
        },
        [papers],
    );

    // 回调 1b: Filter 重置
    const handleFilterReset = useCallback(() => {
        setGlobalFilters({});
        setTimelineSelectionPapers(papers);
        setNetworkSelectionPapers([]);
        setStatisticsSelectionPapers([]);
        setHighlightedPapers([]);
        setSelectedLiteratureItem(null);
    }, [papers]);

    // 回调 2: 接收 Timeline 的筛选结果（基础优先级）
    const handleTimelineFilter = useCallback((ps: any[]) => {
        setTimelineSelectionPapers(ps);
        setNetworkSelectionPapers([]);
        setStatisticsSelectionPapers([]);
        setHighlightedPapers(ps);
        setSelectedLiteratureItem(ps.length > 0 ? ps[0] : null);
    }, []);

    // 回调 3: 接收 Network 的筛选结果 (高优先级)
    const handleNetworkFilter = useCallback((ps: any[]) => {
        setNetworkSelectionPapers(ps);
        setStatisticsSelectionPapers([]);
        setHighlightedPapers(ps);
        setSelectedLiteratureItem(ps.length > 0 ? ps[0] : null);
    }, []);

    // 回调 4: 接收 Statistics 的筛选结果 (中优先级)
    const handleStatisticsFilter = useCallback((ps: any[]) => {
        setStatisticsSelectionPapers(ps);
        setNetworkSelectionPapers([]);
        setHighlightedPapers(ps);
    }, []);

    // 回调 5: 接收点击事件，用于设置高亮和详情
    const handleLiteratureClick = useCallback(
        (ps: any[], selectedItem: any | null) => {
            setHighlightedPapers(ps);
            setSelectedLiteratureItem(selectedItem);
            setNetworkSelectionPapers([]);
            setStatisticsSelectionPapers([]);
        },
        [],
    );

    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Layout
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    background: '#f0f2f5',
                }}
            >
                {/* 顶部筛选栏 */}
                <Layout.Header
                    style={{
                        background: '#fff',
                        padding: '12px 24px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        zIndex: 100,
                        height: 'auto',
                        lineHeight: 'normal',
                        flexShrink: 0,
                    }}
                >
                    <Filter
                        onFilterChange={handleFilterChange}
                        onFilterReset={handleFilterReset}
                    />
                </Layout.Header>

                {/* 主内容区 */}
                <Content
                    style={{
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        flex: 1,
                    }}
                >
                    {papersLoading ? (
                        <div
                            style={{
                                padding: 24,
                                textAlign: 'center',
                                color: '#999',
                            }}
                        >
                            加载数据中...
                        </div>
                    ) : (
                        <>
                            {/* 主体区域：Network + Literature */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 420px',
                                    gap: '16px',
                                    height: '75vh',
                                    minHeight: '600px',
                                    flexShrink: 0,
                                }}
                            >
                                {/* 网络图 */}
                                <div className="dashboard-card">
                                    <h3>作者合作网络</h3>
                                    <div className="chart-container">
                                        <Network
                                            allPapers={timelineSelectionPapers}
                                            onLiteratureFilter={
                                                handleNetworkFilter
                                            }
                                            highlightedPapers={
                                                highlightedPapers
                                            }
                                            onLiteratureClick={
                                                handleLiteratureClick
                                            }
                                        />
                                    </div>
                                </div>

                                {/* 文献详情 */}
                                <div className="dashboard-card">
                                    <h3>文献列表</h3>
                                    <div
                                        style={{ flex: 1, overflow: 'hidden' }}
                                    >
                                        <Literature
                                            filteredNodes={finalLiteratureList}
                                            selectedNode={
                                                selectedLiteratureItem
                                            }
                                            setSelectedNode={
                                                setSelectedLiteratureItem
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 下方区域：Timeline + Statistics */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px',
                                    height: '400px',
                                    flexShrink: 0,
                                }}
                            >
                                {/* Timeline 时间分布 */}
                                <div className="dashboard-card">
                                    <h3>时间分布</h3>
                                    <div className="chart-container">
                                        <Timeline
                                            globalFilters={globalFilters}
                                            allPapers={filteredByGlobal}
                                            onLiteratureFilter={
                                                handleTimelineFilter
                                            }
                                            highlightedPapers={
                                                highlightedPapers
                                            }
                                            onLiteratureClick={
                                                handleLiteratureClick
                                            }
                                            reset={false}
                                        />
                                    </div>
                                </div>

                                {/* Statistics 统计图 */}
                                <div className="dashboard-card">
                                    <h3>统计分析</h3>
                                    <div className="chart-container">
                                        <Statistics
                                            allPapers={finalLiteratureList}
                                            onLiteratureFilter={
                                                handleStatisticsFilter
                                            }
                                            highlightedPapers={
                                                highlightedPapers
                                            }
                                            onLiteratureClick={
                                                handleLiteratureClick
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </Content>
            </Layout>
        </div>
    );
};

export default Index;
