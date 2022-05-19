import {ColorScheme, ColorSchemeProvider, MantineColor, MantineProvider} from '@mantine/core';
import {NotificationsProvider} from '@mantine/notifications';
import {AppProps} from 'next/app';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import '../styles.css'
import {GetServerSidePropsContext} from 'next';
import {getCookie} from 'cookies-next';
import {useEffect, useState} from 'react';
import {useColorScheme} from "@mantine/hooks";
import {LocaleContext, messages} from "@src/locale";

NProgress.configure({showSpinner: false});

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

export default function App(props: AppProps & { colorScheme: ColorScheme, accentColor: MantineColor, locale: string }) {
    const {Component, pageProps} = props;

    const preferredColorScheme = useColorScheme();

    const [colorScheme, setColorScheme] = useState<ColorScheme>(props.colorScheme ?? preferredColorScheme);
    const [accentColor, setAccentColor] = useState<MantineColor>(props.accentColor);
    const [locale, setLocale] = useState<string>(props.locale);

    useEffect(() => {
        if (props.accentColor !== accentColor) setAccentColor(props.accentColor);
        if (props.colorScheme !== colorScheme) setColorScheme(props.colorScheme);
        if (props.locale !== locale) setLocale(props.locale);
    }, [props.accentColor, props.colorScheme, props.locale]);

    // https://mantine.dev/theming/dark-theme/#colorschemeprovider
    const toggleColorScheme = (value?: ColorScheme) =>
        setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

    return (
        <>
            <Head>
                <title>Doki</title>
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width"/>
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="theme-color" content="#000000" />
            </Head>
            
            <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
            <LocaleContext.Provider value={{locale, messages}}>
            <MantineProvider
                withGlobalStyles
                withNormalizeCSS
                theme={{
                    colorScheme: colorScheme,
                    primaryColor: accentColor
                }}
            >
                <NotificationsProvider>
                    <Component {...pageProps} />
                </NotificationsProvider>
            </MantineProvider>
            </LocaleContext.Provider>
            </ColorSchemeProvider>
        </>
    );
}

App.getInitialProps = ({ctx}: { ctx: GetServerSidePropsContext }) => ({
    colorScheme: getCookie("color-scheme", ctx) || null,
    accentColor: getCookie("accent-color", ctx) || 'blue',
    locale: getCookie("locale", ctx) || "en"
});
