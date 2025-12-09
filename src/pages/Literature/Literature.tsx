// Literature.tsx
import React from 'react';
import { Button } from 'antd';

interface LiteratureProps {
    filteredNodes: any[]; // 最终的列表 (来自 index.tsx 的优先级计算)
    selectedNode: any; // 选中的单个节点 (来自 Timeline/Network/Statistics 的点击)
    setSelectedNode: (node: any) => void;
}

const Literature: React.FC<LiteratureProps> = ({
    filteredNodes,
    selectedNode,
    setSelectedNode,
}) => {
    // 排序逻辑 (按年份降序)
    const sortNodes = (nodes: any[]) => {
        return [...nodes].sort((a, b) => (b.Year || 0) - (a.Year || 0));
    };

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {/* 文献列表展示区域 */}
            <div
                style={{
                    flex: selectedNode ? '0 0 50%' : '1',
                    overflowY: 'auto',
                    paddingRight: '5px',
                }}
            >
                <h3 style={{ fontSize: '1em', marginBottom: '10px' }}>
                    当前列表: ({filteredNodes.length}篇)
                </h3>
                <ul>
                    {filteredNodes.length > 0 ? (
                        sortNodes(filteredNodes).map((node, index) => (
                            <li
                                // 确保 Key 唯一
                                key={`${node.PaperId}_${index}`}
                                onClick={() => setSelectedNode(node)}
                                style={{
                                    cursor: 'pointer',
                                    color:
                                        node === selectedNode
                                            ? '#fa541c'
                                            : '#1890ff',
                                    marginBottom: '5px',
                                    padding: '2px 0',
                                    borderBottom: '1px dotted #eee',
                                    fontWeight:
                                        node === selectedNode
                                            ? 'bold'
                                            : 'normal',
                                }}
                            >
                                [{node.Year}] {node.Title}
                            </li>
                        ))
                    ) : (
                        <p
                            style={{
                                color: '#888',
                                textAlign: 'center',
                                marginTop: '50px',
                            }}
                        >
                            当前无文献匹配。
                        </p>
                    )}
                </ul>
            </div>

            {/* 选中文献详情区域 */}
            {selectedNode && (
                <div
                    className="details-container"
                    style={{
                        flex: '1',
                        overflowY: 'auto',
                        marginTop: filteredNodes.length > 0 ? '16px' : '0',
                        padding: '10px 0',
                        borderTop:
                            filteredNodes.length > 0
                                ? '1px solid #eee'
                                : 'none',
                    }}
                >
                    <h4 style={{ color: '#000', marginBottom: '8px' }}>
                        {selectedNode.Title}
                    </h4>
                    <p>
                        <strong>作者:</strong>{' '}
                        {Array.isArray(selectedNode.AuthorNames)
                            ? selectedNode.AuthorNames.join(', ')
                            : selectedNode.AuthorNames || '无'}
                    </p>
                    <p>
                        <strong>年份:</strong> {selectedNode.Year || '无'}
                    </p>
                    <p>
                        <strong>会议:</strong> {selectedNode.Conference || '无'}
                    </p>
                    <p>
                        <strong>奖项:</strong> {selectedNode.Award || '无'}
                    </p>
                    <p>
                        <strong>摘要:</strong> {selectedNode.Abstract || '无'}
                    </p>
                    <p>
                        <strong>资源类别:</strong>{' '}
                        {Array.isArray(selectedNode.Resources)
                            ? selectedNode.Resources.join(', ')
                            : selectedNode.Resources || '无'}
                    </p>
                    {/* 📌 详情超链接 */}
                    <p>
                        <strong>链接：</strong>
                        <a
                            href={selectedNode.Link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {selectedNode.Link ? '点击查看' : '无链接'}
                        </a>
                    </p>
                    <Button
                        onClick={() => setSelectedNode(null)}
                        style={{ marginTop: '10px' }}
                        size="small"
                    >
                        关闭详情
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Literature;
