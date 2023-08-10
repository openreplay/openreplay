import React from 'react';
import styles from './CohortCard.module.css';


interface Props {
    data: any
}
function CohortCard(props: Props) {
    // const { data } = props;
    const data = [
        {
          cohort: '2022-01-01',
          users: 100,
          data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        {
          cohort: '2022-01-08',
          users: 100,
          data: [90, 70, 50, 30],
        },
        // ... more rows
      ];

      const getCellColor = (value: number) => {
        const maxValue = 100; // Adjust this based on the maximum value in your data
        const maxOpacity = 0.5;
        const opacity = (value / maxValue) * maxOpacity;
        return `rgba(62, 170, 175, ${opacity})`;
      };
      
    return (
        <div className={styles.cohortTableContainer}>
            <div className={styles.fixedTableWrapper}>
            <table className={styles.cohortTable}>
                <thead>
                    <tr>
                        <th className={`${styles.cell} text-left`}>Date</th>
                        <th className={`${styles.cell} text-left`}>Users</th>
                    </tr>
                    <tr>
                        <th className={`${styles.cell} ${styles.header}`}></th>
                        <th className={`${styles.cell} ${styles.header}`}></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={`row-fixed-${rowIndex}`}>
                            <td className={styles.cell}>{row.cohort}</td>
                            <td className={styles.cell}>{row.users}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
            <div className={styles.scrollableTableWrapper}>
            <table className={styles.cohortTable}>
                <thead>
                    <tr>
                        <th className={`${styles.cell}`} style={{ textAlign: 'left'}} colSpan={10}>Weeks later users retained</th>
                    </tr>
                    <tr>
                        {data[0].data.map((_, index) => (
                        <th key={`header-${index}`} className={`${styles.cell} ${styles.header}`}>{`${index + 1}`}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={`row-scrollable-${rowIndex}`}>
                    {row.data.map((cell, cellIndex) => (
                        <td key={`cell-${rowIndex}-${cellIndex} text-center`} className={styles.cell} style={{ backgroundColor: getCellColor(cell) }}>{cell}%</td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

export default CohortCard;