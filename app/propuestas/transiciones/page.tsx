import type{Metadata}from'next';
import {TransitionStudio}from'@/components/deuce/TransitionStudio';
import styles from'../jugadores/study.module.css';
export const metadata:Metadata={title:'Transiciones — DEUCE',robots:{index:false,follow:false}};
export default function TransitionPage(){return <div className={styles.page}><header className={styles.heading}><h1>Transiciones</h1></header><TransitionStudio/></div>;}
