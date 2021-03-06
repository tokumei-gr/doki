import {
    Accordion,
    Button,
    Checkbox,
    Divider,
    Group,
    LoadingOverlay,
    Modal,
    Pagination,
    Select, SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
    Transition,
    useMantineTheme
} from '@mantine/core';
import GridItem from '../components/grid-item';
import Layout from '../components/layout';
import SEO from '../components/seo';
import {Author, File} from "@server/models";
import {useCallback, useContext, useEffect, useState} from "react";
import {Edit} from 'tabler-icons-react';
import {useRouter} from 'next/router';
import {getExt, retrieveAllFileTypes, retrieveAllTags} from "../../utils/file";
import Link from "next/link";
import {getCookie, hasCookie} from "cookies-next";
import {NextPageContext} from "next";
import useSWR, {useSWRConfig} from "swr";
import {showNotification} from "@mantine/notifications";
import {getLocale, LocaleContext} from "@src/locale";
import {EditBox} from '@src/components/upload-forms';
import {SeekForAuthor} from "../../utils/id_management";

interface PageProps {
    posts: File[];
    author: Author;
    filter: string[];
}

export async function getServerSideProps(nextPage: NextPageContext) {
    // TODO: Implement pagination as an alternative

    // this is slow as fuck.
    /*const posts = await FileRepository.findAll({
        include: {
            model: Author,
            required: true
        },
        limit: 10
    });*/

    const author = await SeekForAuthor(getCookie('DokiIdentification', nextPage));
    return {
        props: {
            // posts,
            author,
            filter: hasCookie('filtered', nextPage) ? JSON.parse(getCookie('filtered', nextPage) as string) : []
        }
    };
}

function SearchInput({ onSubmit }) {
    const locale = useContext(LocaleContext);
    const [searchTerm, setSearchTerm] = useState<string>('');
    return <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit(searchTerm);
    }}><TextInput autoFocus value={searchTerm} placeholder={`${getLocale(locale).Browser["search"]}`} onChange={(v) => setSearchTerm(v.target.value)} /></form>
}

interface PostsResponse {
    posts: File[];
    amount: number;
    allTags: string[];
    allCategories: string[];
    allTypes: string[];
}

const fetcher = async (url) => {
    const res = await fetch(url);
    const data = await res.json();

    if (res.status !== 200) {
        throw new Error(data.message);
    }
    return data as PostsResponse;
}

function Page(props: PageProps) {
    const theme = useMantineTheme();
    //const mobile = useMediaQuery('(max-width: 450px)');
    const router = useRouter();
    const locale = useContext(LocaleContext);
    const {mutate} = useSWRConfig();
    const [activePage, setPage] = useState(1);
    const [category, setCategory] = useState(null);
    const [tag, setTag] = useState(null);
    const [type, setType] = useState(null);
    const [onlyUsers, setOnlyUsers] = useState<boolean>(false);
    const [sort, setSort] = useState<string>("Time");
    const [searchF, setSearchF] = useState('');
    const { data, error } = useSWR(`/api/posts?page=${activePage}&sort=${sort}${category ? "&category=" + category : ''}${tag ? "&tag=" + tag : ''}${type ? "&type=" + type : ''}${(onlyUsers && props.author) ? "&author=" + props.author.AuthorId : ''}`, fetcher);
    const [noFiles, setNoFiles] = useState<boolean>(false);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [selected, setSelected] = useState<File[]>([]);
    const [editDetails, setEditDetails] = useState(false);
    const [willDelete, setWillDelete] = useState(false);

    useEffect(() => {
        if (router.query["f"]) {
            setCategory(router.query["f"])
        } else {
            setCategory(null);
        }

        if (router.query["t"]) {
            setTag(router.query["t"])
        } else {
            setTag(null);
        }

        if (router.query["type"]) {
            setType(router.query["type"])
        } else {
            setType(null);
        }

        mutate('/api/posts');
    }, [router.query]);

    useEffect(() => {
        if (error) {
            showNotification({
                color: "red",
                title: "Error loading view",
                message: error.message
            });
        } else {
            setNoFiles(data === undefined);
        }
    }, [data, error]);

    useEffect(() => {
        if (selected.length === 0) setEditDetails(false);
    }, [selected, editMode]);

    function handleSelect(value) {
        setSort(value);
        mutate('/api/posts');
    }

    function handleOnlyUser(event) {
        setOnlyUsers(event.currentTarget.checked);
    }

    function _sort(a, b) {
        switch (sort) {
            case "Time":
                return b.UnixTime - a.UnixTime;
            case "Size":
                return b.Size - a.Size;
            case "Views":
                return b.Views - a.Views;
            default:
                return;
        }
    }

    const toggleEditMode = useCallback(() => {
        if (editMode) {
            setSelected([]);
        }
        setEditMode(!editMode);
    }, [editMode]);

    function handleSearch(search) {
        setSearchF(search);
    }

    async function deleteSelected() {
        try {
            const res = await fetch(`/api/delete`, {
                body: JSON.stringify({
                    author: props.author,
                    files: selected
                }),
                method: 'POST'
            });
            const json = await res.json();
            showNotification({
                title: "File catelog updated",
                message: json.message,
                color: "green"
            });
            await mutate('/api/posts');
        } catch (error) {
            console.error(error);
            showNotification({
                title: "Deletion failed!",
                message: error.message,
                color: "red"
            })
        } finally {
            setSelected([]);
            setWillDelete(false);
        }
    }

    return <Layout asideContent={
        <>
            <Text mb="md" size="xs">{(data && data.amount) ?? 0} file(s) on the server</Text>
            <Pagination mb="md" page={activePage} size="xs" onChange={setPage} styles={{ item: { fontFamily: 'Manrope' } }} total={(data && (onlyUsers ? 
                Math.floor(data.posts.filter(f => onlyUsers && props.author ? f.AuthorId === props.author.AuthorId : f).length / 25 + 1) : Math.floor(data.amount / 25 + 1))) ?? 0} withEdges grow />
            <SearchInput onSubmit={handleSearch}/>
            <Transition mounted={Boolean(props.author)} transition="slide-down">{(styles) => <Accordion style={styles} mt="md" sx={{
                backgroundColor: theme.colorScheme === "light" ? theme.white : theme.colors.dark[5],
                borderRadius: 4
            }} styles={{
                contentInner: {padding: 0}
            }} offsetIcon={false} onChange={toggleEditMode} disableIconRotation>
                <Accordion.Item sx={{border: "none"}} icon={<Edit size={16}/>} styles={{label: {fontSize: 12}}}
                                label={`${getLocale(locale).Browser["edit-mode"]}`}>
                    <Stack>
                        <Text size="xs">{selected.length}{` ${getLocale(locale).Browser["selected"]}`}</Text>
                        <Button disabled={selected.length === 0} onClick={() => setEditDetails(true)}
                                variant="light">{`${getLocale(locale).Browser["edit-details"]}`}</Button>
                        <Button disabled={selected.length === 0} onClick={() => setWillDelete(true)} variant="light"
                                color="red">{`${getLocale(locale).Browser["delete-files"]}`}</Button>
                    </Stack>
                </Accordion.Item>
            </Accordion>}</Transition>
            <Divider label={`${getLocale(locale).Browser["view-options"]}`} mt="sm"/>
            <Select label={`${getLocale(locale).Browser["sort"]}`} mt="xs" value={sort} onChange={handleSelect}
                    data={["Time", "Size", "Views"]}/>
            <Checkbox disabled={!props.author} label={`${getLocale(locale).Browser["show-only"]}`} mt="sm"
                      checked={onlyUsers}
                      onChange={handleOnlyUser}/>
            {/*<Text size="xs" my="md">Scale</Text>
            <Slider label={scale} value={scale} onChange={onScaleChange} min={1} max={8} mb="md" />*/}
            {data && <Transition transition="slide-down" mounted={Boolean(data.allCategories.length > 0)}>{(styles) => <Divider style={styles} label={`${getLocale(locale).Viewer["nc-category"]}`} mb="sm" my="md" />}</Transition>}
            {data && <Transition mounted={Boolean(data.allCategories.length > 0)} transition="slide-down">{(styles) => <Stack style={styles} spacing={0}>
                {data.allCategories.map((elem, index) =>
                        <Link href={`/browser?f=${elem}`} key={index} passHref>
                            <Text size="xs" color={theme.colors.blue[4]} sx={{
                                textDecoration: "none",
                                cursor: "pointer",
                                "&:hover": {textDecoration: "underline"}
                            }}>{elem}</Text>
                        </Link>)}
            </Stack>}</Transition>}
            {data && <Transition mounted={Boolean(data.allTags.length > 0)} transition="slide-down">{(styles) => <Divider style={styles} label={`${getLocale(locale).Browser["tags"]}`} mb="sm" my="sm"/>}</Transition>}
            {data && <Transition mounted={Boolean(data.allTags.length > 0)} transition="slide-down">{(styles) => <Stack style={styles} spacing={0}>
                {data.allTags.map((t, i) =>
                    <Link href={`/browser?t=${t}`} key={i} passHref>
                        <Text size="xs" color={theme.colors.blue[4]} sx={{
                            textDecoration: "none",
                            cursor: "pointer",
                            "&:hover": {textDecoration: "underline"}
                        }}>{t}</Text>
                    </Link>)}
            </Stack>}</Transition>}
            {data && <Transition mounted={Boolean(data.allTypes.length > 0)} transition="slide-down">{(styles) => <Divider style={styles} label={`${getLocale(locale).Browser["file-types"]}`} mb="sm" my="sm"/>}</Transition>}
            {data && <Transition mounted={Boolean(data.allTypes.length > 0)} transition="slide-down">{(styles) => <Stack style={styles} spacing={0}>
                {data.allTypes.map((t, i) =>
                    <Link href={`/browser?type=${t}`} key={i} passHref>
                        <Text size="xs" color={theme.colors.blue[4]} sx={{
                            textDecoration: "none",
                            cursor: "pointer",
                            "&:hover": {textDecoration: "underline"}
                        }}>{t}</Text>
                    </Link>)}
            </Stack>}</Transition>}
        </>
    }>
        <SEO title="Browser" siteTitle="Doki" description="Content for days"/>
        {data && <SimpleGrid cols={5} breakpoints={[
            { maxWidth: 'lg', cols: 4, spacing: 'md' },
            { maxWidth: 'md', cols: 3, spacing: 'md' },
            { maxWidth: 'sm', cols: 2, spacing: 'sm' },
            { maxWidth: 'xs', cols: 1, spacing: 'sm' },
        ]}>
            {data && data.posts
                .sort(_sort)
                .filter(f => onlyUsers && props.author ? f.AuthorId === props.author.AuthorId : f)
                .filter(f => f.Tags ? f.Tags.split(",").map(l => l.match(searchF)) : f)
                .filter(f => f.Title ? f.Title.match(searchF) : f)
                .filter(f => f.FileURL.match(searchF))
                .map((elem, index) =>
                    <Transition mounted={Boolean(elem)} transition="fade" key={index}>
                        {(styles) => <GridItem onlyUsers={onlyUsers} style={styles} author={props.author} editMode={editMode} selected={selected.includes(elem)}
                        onUnselect={(f) => setSelected(p => p.filter(x => x !== f))}
                        onSelect={(f) => setSelected(p => [...p, f])} data={elem} />}</Transition>)}
            </SimpleGrid>}

        <Modal size="xl" opened={editDetails} title="Edit details" onClose={() => setEditDetails(false)}
               styles={{
                   modal: {background: 'transparent', boxShadow: 'none'},
                   title: { color: 'white', filter: `drop-shadow(0px 5px 2px rgb(0 0 0 / 0.4))` },
                   body: { background: 'transparent', padding: 0, margin: 0, filter: `drop-shadow(0px 5px 2px rgb(0 0 0 / 0.4))` },
                   close: {
                       color: 'white',
                       '&:hover': {
                           background: '#ffffff22'
                       },
                       filter: `drop-shadow(0px 5px 2px rgb(0 0 0 / 0.4))`
                   },
               }}
        >
            <Stack>
                {selected && selected.map((e, i) => (
                    <EditBox author={props.author} cancel={() => setSelected(selected.filter(x => x.Id != e.Id))}
                             posts={data.posts} file={e} key={i}/>
                ))}
            </Stack>
        </Modal>

        <Modal centered opened={willDelete} title="Delete file(s)" onClose={() => setWillDelete(false)}>
            <Group position='apart'>
                <Text size="xs">Are you sure you want to delete these files?</Text>
                <Button onClick={deleteSelected} color="red" variant="light">Delete file(s)</Button></Group>
        </Modal>
    </Layout>;
}

export default Page;

