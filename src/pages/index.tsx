import styles from './index.less';
import { Col, Row } from 'antd';
import React, { useEffect } from 'react';
import TimeLine from './TimeLine';
import Network from './Network';
import request from 'umi-request';

const Index: React.FC = () => {
    useEffect(() => {
        request.get('/server/add/1/2').then((res) => {
            console.log(res);
        });
        request.post('/server/test', {
            data: {
                name: 'test1'
            }
        }).then((res) => {
            console.log(res);
        })
    }, []);

    
    
    return (
        <>
            <Row align="middle" gutter={16}>
                <Col
                    style={{
                        border: '1px solid #222',
                    }}
                    span={17}
                >
                    <div
                        style={{
                            height: '50hv',
                        }}
                    >
                        {/* 留空区域 */}
                    </div>
                </Col>
                <Col
                    style={{
                        border: '1px solid #222',
                    }}
                    span={7}
                >
                    <div
                        style={{
                            height: '50hv',
                        }}
                    >
                        <TimeLine />
                        
                    </div>
                </Col>
            </Row>
            <Row align="middle" gutter={16}>
                <Col
                    style={{
                        border: '1px solid #222',
                    }}
                    span={17}
                >
                    <div
                        style={{
                            height: '50hv',
                        }}
                    >
                        <Network />
                    </div>
                </Col>
                <Col
                    style={{
                        border: '1px solid #222',
                    }}
                    span={7}
                >
                    <div
                        style={{
                            height: '50hv',
                        }}
                    >
                        {/* 留空区域 */}
                    </div>
                </Col>
            </Row>
        </>
    );
};


export default Index;
