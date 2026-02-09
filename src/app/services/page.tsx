"use client";
import Link from "next/link";
import { useLanguage } from "../_components/LanguageContext";

const servicesRo = [
	{
		icon: "🧑‍💼",
		title: "Consultanță tehnică, proiectare și instruire personal",
		description:
			"Oferim consultanță tehnică, proiectare de sisteme și instruire specializată pentru personalul dumneavoastră.",
		slug: "consultanta-tehnica",
	},
	{
		icon: "🏭",
		title: "Proiectare și execuție stații și linii industriale",
		description:
			"Realizăm proiectarea și execuția stațiilor și liniilor industriale la cheie, adaptate cerințelor de producție.",
		slug: "proiectare-statii-linii",
	},
	{
		icon: "🔄",
		title: "Modernizare instalații și retrofit echipamente",
		description:
			"Modernizăm instalații existente și realizăm retrofit pentru echipamente industriale pentru eficiență crescută.",
		slug: "modernizare-retrofit",
	},
	{
		icon: "🤖",
		title: "Integrarea Roboților Industriali",
		description:
			"Inegram roboți industriali în fluxurile de producție pentru automatizare avansată.",
		slug: "integrare-roboti",
	},
	{
		icon: "🚚",
		title: "Relocare Linii Producție",
		description:
			"Asigurăm relocarea completă a liniilor de producție, cu minim de întreruperi.",
		slug: "relocare-linii",
	},
	{
		icon: "🛡️",
		title: "Mentenanță preventivă, predictivă și service echipamente industriale",
		description:
			"Oferim servicii de mentenanță preventivă, predictivă și intervenții rapide pentru echipamente industriale.",
		slug: "mentenanta-service",
	},
	{
		icon: "⚙️",
		title: "Proiectare componente mecanice custom",
		description:
			"Proiectăm și realizăm componente mecanice personalizate pentru aplicații industriale diverse.",
		slug: "componente-mecanice",
	},
	{
		icon: "🔌",
		title: "Producție tablouri electrice",
		description:
			"Proiectăm și producem tablouri electrice pentru automatizări industriale și distribuție electrică.",
		slug: "tablouri-electrice",
	},
];

const servicesEn = [
	{
		icon: "🧑‍💼",
		title: "Technical consulting, design and personnel training",
		description:
			"We offer technical consulting, system design and specialized training for your staff.",
		slug: "consultanta-tehnica",
	},
	{
		icon: "🏭",
		title: "Design and execution of industrial stations and lines",
		description:
			"We design and execute turnkey industrial stations and lines, adapted to production requirements.",
		slug: "proiectare-statii-linii",
	},
	{
		icon: "🔄",
		title: "Installation modernization and equipment retrofit",
		description:
			"We modernize existing installations and retrofit industrial equipment for increased efficiency.",
		slug: "modernizare-retrofit",
	},
	{
		icon: "🤖",
		title: "Industrial Robot Integration",
		description:
			"We integrate industrial robots into production flows for advanced automation.",
		slug: "integrare-roboti",
	},
	{
		icon: "🚚",
		title: "Production Line Relocation",
		description:
			"We ensure complete relocation of production lines with minimal interruptions.",
		slug: "relocare-linii",
	},
	{
		icon: "🛡️",
		title: "Preventive, predictive maintenance and industrial equipment service",
		description:
			"We offer preventive, predictive maintenance services and quick interventions for industrial equipment.",
		slug: "mentenanta-service",
	},
	{
		icon: "⚙️",
		title: "Custom mechanical component design",
		description:
			"We design and manufacture customized mechanical components for various industrial applications.",
		slug: "componente-mecanice",
	},
	{
		icon: "🔌",
		title: "Electric panel production",
		description:
			"We design and produce electric panels for industrial automation and electrical distribution.",
		slug: "tablouri-electrice",
	},
];

export default function ServicesPage() {
	const { language } = useLanguage();
	const services = language === "en" ? servicesEn : servicesRo;
	const pageTitle = language === "en" ? "Our Services" : "Serviciile noastre";
	const learnMore = language === "en" ? "Learn more" : "Află mai mult";
	
	return (
		<main className="container mx-auto py-10 px-4">
			<h1 className="text-3xl font-bold mb-8 text-center">
				{pageTitle}
			</h1>
			<div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem'}}>
				{services.map((service) => (
					<Link
						key={service.slug}
						href={`/services/${service.slug}`}
						className="group focus:outline-none"
						style={{
							background: 'linear-gradient(135deg, #b6c7e3 0%, #3a5ba0 100%)',
							borderRadius: '1rem',
							boxShadow: '0 4px 16px rgba(58,91,160,0.12)',
							padding: '2rem',
							color: '#fff',
							textAlign: 'center',
							border: '1px solid #b6c7e3',
							textDecoration: 'none',
							cursor: 'pointer',
							transition: 'box-shadow 0.2s, transform 0.2s',
						}}
						aria-label={`${learnMore} ${service.title}`}
						tabIndex={0}
					>
						<div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>{service.icon}</div>
						<h2 style={{fontWeight: 600, marginBottom: '0.5rem'}}>{service.title}</h2>
						<p>{service.description}</p>
						<div style={{marginTop: '1.5rem'}}>
							<span className="inline-block bg-white text-blue-700 font-semibold px-4 py-2 rounded shadow transition group-hover:bg-blue-100 group-hover:text-blue-900 group-focus:bg-blue-100 group-focus:text-blue-900" style={{fontSize:'1rem'}}>{learnMore} &rarr;</span>
						</div>
					</Link>
				))}
			</div>
		</main>
	);
}